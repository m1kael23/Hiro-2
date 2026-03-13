import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import LocationAutocomplete from '../ui/LocationAutocomplete';
import { DNA_DIMENSIONS, getArchetype, defaultDna, calcDnaScore, getDnaLabel } from '../../lib/dnaEngine';
import { getGeminiClient } from '../../services/geminiService';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { fanOutCandidateMatches } from '../../lib/matchingEngine';

/* ─────────────────────────────────────────────
   Static data
───────────────────────────────────────────── */
const ROLE_SKILLS_DB = {
  'Product Manager': ['Product Strategy','Roadmapping','User Research','Agile','SQL','Stakeholder Management','A/B Testing','Market Analysis'],
  'Product Management': ['Product Strategy','Roadmapping','User Research','Agile','SQL','Stakeholder Management','A/B Testing','Market Analysis'],
  'Software Engineer': ['React','Node.js','TypeScript','PostgreSQL','AWS','System Design','Unit Testing','CI/CD'],
  'Frontend Developer': ['React','CSS/Tailwind','TypeScript','Next.js','State Management','Performance Optimization'],
  'Backend Developer': ['Node.js','Python','Go','PostgreSQL','Redis','Microservices','API Design','Docker'],
  'Designer': ['Figma','UI/UX Design','Prototyping','Design Systems','User Testing','Visual Design'],
  'Marketing': ['SEO','Content Strategy','Google Analytics','Social Media Marketing','Copywriting','Email Marketing'],
  'Sales': ['CRM','Lead Generation','Negotiation','Sales Strategy','Relationship Management'],
  'Data Scientist': ['Python','R','Machine Learning','SQL','Data Visualization','Statistics'],
};

const ALL_SKILLS = [
  'Product Management','Fintech','B2B SaaS','AI/ML','Payments','Growth','Data Analysis',
  'SQL','Stakeholder management','Agile','React','Python','Go-to-market','Design',
  'Marketing','Sales','Engineering','Operations','People & HR','Finance','TypeScript',
  'Node.js','Leadership','Strategy','User Research',
];

const CULTURE_TAGS = [
  '🏆 High-ownership teams','⚡ Async-first','🚀 Fast-paced, high ambition',
  '📋 Structured & process-led','🎯 Mission-driven','💻 Engineering-led',
  '🎨 Design-led','📊 Data-driven decisions','🏗 Flat hierarchy',
  '📚 Strong L&D culture','🌍 Remote-friendly','🤝 Collaborative by default',
];

const CAND_STEPS = [
  { n:1, label:'Who are you?',     desc:'Role & experience',      eta:'~5 min' },
  { n:2, label:'Experience',       desc:'Career history',          eta:'~4 min' },
  { n:3, label:'Skills',           desc:'Your skill graph',        eta:'~3 min' },
  { n:4, label:'Work DNA™',        desc:'How you actually work',   eta:'~2 min' },
  { n:5, label:'What you want',    desc:'Salary & stage',          eta:'~2 min' },
  { n:6, label:'Your fingerprint', desc:'Review & go live',        eta:'~1 min' },
];

const EMP_STEPS = [
  { n:1, label:'Company',         desc:'Company identity',    eta:'~5 min' },
  { n:2, label:'Culture',         desc:'Culture fingerprint', eta:'~4 min' },
  { n:3, label:'Team DNA™',       desc:'Working style',       eta:'~3 min' },
  { n:4, label:'Open Roles',      desc:'What you need',       eta:'~2 min' },
  { n:5, label:'Trust Settings',  desc:'Review & trust',      eta:'~1 min' },
];

/* ─────────────────────────────────────────────
   Career trajectory helpers
   Stored per work-experience entry as:
   { title, company, startYear, endYear|null,
     isCurrent, description, skills[] }

   Algorithm builds a "trajectory vector":
   - seniority progression (IC → Lead → Manager → Director)
   - domain consistency / breadth
   - average tenure
   - velocity (promotions per year)
   Used in matching to weight candidates who
   are on a rising trajectory toward the role.
───────────────────────────────────────────── */
const SENIORITY_RANK = {
  intern:0, junior:1, associate:1, analyst:1,
  mid:2, engineer:2, manager:2, designer:2,
  senior:3, lead:3, staff:3, principal:4,
  director:4, head:4, vp:5, 'c-suite':6,
};

function detectSeniorityRank(title='') {
  const t = title.toLowerCase();
  for (const [keyword, rank] of Object.entries(SENIORITY_RANK)) {
    if (t.includes(keyword)) return rank;
  }
  return 2; // default mid
}

export function calcCareerTrajectory(experiences=[]) {
  if (!experiences.length) return { velocity:0, consistency:50, avgTenure:0, seniorityDelta:0, summary:'' };
  const sorted = [...experiences].sort((a,b) => (a.startYear||0)-(b.startYear||0));
  const now = new Date().getFullYear();

  // tenure
  const tenures = sorted.map(e => {
    const end = e.isCurrent ? now : (e.endYear || now);
    return Math.max(0, end - (e.startYear || now));
  });
  const avgTenure = tenures.reduce((a,b)=>a+b,0) / tenures.length;

  // seniority trajectory
  const ranks = sorted.map(e => detectSeniorityRank(e.title));
  const seniorityDelta = ranks[ranks.length-1] - ranks[0];
  const totalYears = Math.max(1, (now - (sorted[0]?.startYear||now)));
  const velocity = seniorityDelta / totalYears;

  // domain consistency (do job titles share keywords?)
  const titleWords = sorted.flatMap(e => (e.title||'').toLowerCase().split(/\s+/));
  const freq = {};
  titleWords.forEach(w => { if (w.length > 3) freq[w] = (freq[w]||0)+1; });
  const maxFreq = Math.max(...Object.values(freq), 1);
  const consistency = Math.min(100, Math.round((maxFreq / sorted.length) * 100));

  // human-readable summary
  const latestRank = ranks[ranks.length-1];
  const trajectory = seniorityDelta > 2 ? 'Strong upward' : seniorityDelta > 0 ? 'Steady upward' : 'Lateral / specialist';
  const summary = `${trajectory} trajectory · ${totalYears}y total · avg ${avgTenure.toFixed(1)}y tenure`;

  return { velocity, consistency, avgTenure, seniorityDelta, latestRank, totalYears, summary };
}

/* ─────────────────────────────────────────────
   DNA Slider — interactive, matching HTML mockup exactly
   Uses pointer capture for smooth drag
───────────────────────────────────────────── */
function DnaSlider({ dim, index, value, onChange, accentColor='var(--violet)' }) {
  const trackRef = useRef(null);
  const dragging = useRef(false);

  const labelIdx = Math.min(4, Math.floor((value / 100) * 5));
  const label = dim.labels[labelIdx];

  function calcPct(clientX) {
    const rect = trackRef.current.getBoundingClientRect();
    return Math.max(2, Math.min(98, Math.round(((clientX - rect.left) / rect.width) * 100)));
  }

  function onPointerDown(e) {
    dragging.current = true;
    trackRef.current.setPointerCapture(e.pointerId);
    onChange(index, calcPct(e.clientX));
  }
  function onPointerMove(e) {
    if (!dragging.current) return;
    onChange(index, calcPct(e.clientX));
  }
  function onPointerUp() { dragging.current = false; }

  return (
    <div className="ob-dna-dim">
      <div className="ob-dna-dim-header">
        <span className="ob-dna-dim-icon">{dim.icon}</span>
        <span className="ob-dna-dim-label">{dim.label}</span>
      </div>
      <div className="ob-dna-ends">
        <span>{dim.left}</span>
        <span>{dim.right}</span>
      </div>
      <div
        ref={trackRef}
        className="ob-dna-track"
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="ob-dna-fill" style={{ width: `${value}%`, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)` }} />
        <div className="ob-dna-thumb" style={{ left: `${value}%`, background: accentColor, boxShadow: `0 2px 8px ${accentColor}80` }} />
      </div>
      <div className="ob-dna-dim-desc" style={{ color: accentColor }}>→ {label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Work Experience Card
───────────────────────────────────────────── */
function ExpCard({ exp, num, onChange, onRemove }) {
  return (
    <div className="ob-role-card" style={{ position: 'relative' }}>
      {num > 1 && (
        <button onClick={onRemove} style={{ position:'absolute', top:12, right:14, background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:16, lineHeight:1 }}>×</button>
      )}
      <div className="ob-role-header">
        <div className="ob-role-num">{num}</div>
        <input
          className="inp ob-role-title-input"
          type="text"
          placeholder="Job title e.g. Senior Product Manager"
          value={exp.title}
          onChange={e => onChange('title', e.target.value)}
          style={{ background:'transparent', border:'none', outline:'none', fontWeight:700 }}
        />
      </div>
      <div className="ob-field-row" style={{ marginBottom: 12 }}>
        <div className="ob-field" style={{ marginBottom:0 }}>
          <label className="ob-field-label">Company</label>
          <input className="inp" type="text" placeholder="Company name" value={exp.company} onChange={e => onChange('company', e.target.value)} />
        </div>
        <div className="ob-field" style={{ marginBottom:0 }}>
          <label className="ob-field-label">Location</label>
          <input className="inp" type="text" placeholder="London, UK / Remote" value={exp.location} onChange={e => onChange('location', e.target.value)} />
        </div>
      </div>
      <div className="ob-field-row" style={{ marginBottom: 12 }}>
        <div className="ob-field" style={{ marginBottom:0 }}>
          <label className="ob-field-label">Start year</label>
          <select className="sel" value={exp.startYear} onChange={e => onChange('startYear', parseInt(e.target.value))}>
            {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
        <div className="ob-field" style={{ marginBottom:0 }}>
          <label className="ob-field-label">End year</label>
          {exp.isCurrent ? (
            <div style={{ padding:'10px 13px', background:'var(--teal-lt)', border:'1px solid rgba(13,148,136,.25)', borderRadius:8, fontSize:13, color:'var(--teal)', fontWeight:600 }}>Present</div>
          ) : (
            <select className="sel" value={exp.endYear} onChange={e => onChange('endYear', parseInt(e.target.value))}>
              {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y}>{y}</option>)}
            </select>
          )}
        </div>
      </div>
      <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, cursor:'pointer', fontSize:13, color:'var(--text2)' }}>
        <input type="checkbox" checked={exp.isCurrent} onChange={e => onChange('isCurrent', e.target.checked)} />
        I currently work here
      </label>
      <div className="ob-field" style={{ marginBottom:0 }}>
        <label className="ob-field-label">What did you do? <span style={{ fontWeight:400, textTransform:'none' }}>(optional — helps AI suggest skills)</span></label>
        <textarea
          className="inp"
          placeholder="Brief description of responsibilities, impact, and outcomes…"
          value={exp.description}
          onChange={e => onChange('description', e.target.value)}
          rows={3}
          style={{ resize:'vertical', width:'100%' }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Sidebar
───────────────────────────────────────────── */
function StepSidebar({ step, completed, steps, mode, archetype, showArchetype }) {
  return (
    <aside className="onboard-sidebar">
      <div className="onboard-logo">
        <div className="onboard-logo-mark">H</div>
        <span className="onboard-logo-text">hiro<span>.</span></span>
      </div>
      <div className="ob-steps-label">{mode === 'employer' ? 'Company Setup' : 'Your profile setup'}</div>
      <div className="ob-step-list">
        {steps.map((s, i) => {
          const done   = completed.includes(s.n);
          const active = step === s.n;
          return (
            <div key={s.n}>
              {i > 0 && <div className={`ob-step-connector${done ? ' done' : ''}`} />}
              <div className={`ob-step-item${active ? ' active' : ''}${done ? ' done' : ''}`}>
                <div className="ob-step-num">{done ? '✓' : s.n}</div>
                <div className="ob-step-info">
                  <div className="ob-step-name">{s.label}</div>
                  <div className="ob-step-sub">{s.desc}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DNA archetype badge — candidate step 4+ */}
      {showArchetype && archetype && (
        <div style={{ marginTop:20, padding:'12px 14px', background:`${archetype.color}12`, border:`1px solid ${archetype.color}30`, borderRadius:'var(--r)' }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:archetype.color, marginBottom:4 }}>🧬 Your DNA archetype</div>
          <div style={{ fontSize:15, fontWeight:800, color:'var(--text)', marginBottom:2 }}>{archetype.emoji} {archetype.name}</div>
          <div style={{ fontSize:11, color:'var(--text3)' }}>Unlocks culture-fit scoring on every role</div>
        </div>
      )}

      <div className="ob-sidebar-quote">
        {mode === 'employer'
          ? <><strong>"Most job boards ask you to post a role. Hiro asks you to share who you actually are."</strong><br />Profiles with culture tags see <strong>40% fewer</strong> wasted interviews.</>
          : <>&quot;Most job boards ask you to describe yourself.&quot; Hiro learns who you actually are — and matches you to roles where you&apos;ll genuinely thrive.</>
        }
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────
   Right Panel — live match pool + card preview
   Employer: query candidates by DNA overlap + role title keywords
   Candidate: query jobs by title keywords + salary + skills + DNA
───────────────────────────────────────────── */
function RightPanel({
  mode, step, steps, matchCount, liveCount,
  firstName, lastName, title, location, salary, skills,
  companyName, industry, companyStage, dna, roles,
}) {
  const circumference = 163.4;
  const maxCount = mode === 'employer' ? 700 : 250;
  const displayCount = liveCount > 0 ? liveCount : matchCount;
  const arcOffset = circumference - (circumference * Math.min(displayCount, maxCount) / maxCount);

  const gradStop1 = mode === 'employer' ? '#0d9488' : '#6c47ff';
  const gradStop2 = mode === 'employer' ? '#22c55e' : '#f9a8d4';
  const gradId    = mode === 'employer' ? 'poolGrad' : 'matchGrad';

  return (
    <aside className="onboard-right-panel">
      {/* Match pool */}
      <div className="ob-pool-widget">
        <div className="ob-pool-label">{mode === 'employer' ? 'Live Candidate Match Pool' : 'Live Job Match Pool'}</div>
        <div className="ob-pool-top">
          <div className="ob-pool-ring">
            <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform:'rotate(-90deg)' }}>
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="6"/>
              <circle cx="32" cy="32" r="26" fill="none" stroke={`url(#${gradId})`} strokeWidth="6"
                strokeDasharray={circumference} strokeDashoffset={arcOffset}
                strokeLinecap="round" style={{ transition:'stroke-dashoffset .6s ease' }}/>
              <defs>
                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={gradStop1}/>
                  <stop offset="100%" stopColor={gradStop2}/>
                </linearGradient>
              </defs>
            </svg>
            <div className="ob-pool-ring-text">
              <div className="ob-pool-ring-num">{displayCount}</div>
              <div className="ob-pool-ring-sub">matched</div>
            </div>
          </div>
          <div>
            <div className="ob-pool-info-title">{displayCount} {mode === 'employer' ? 'candidates' : 'roles'} matched</div>
            <div className="ob-pool-info-sub">{mode === 'employer' ? 'Active, verified professionals who fit your profile.' : 'Live opportunities matching your emerging profile.'}</div>
            <div className="ob-pool-growing" style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:999, background: mode==='employer' ? 'var(--green-lt)' : 'var(--violet-lt)', border:`1px solid ${mode==='employer' ? 'rgba(34,197,94,.2)' : 'rgba(108,71,255,.2)'}`, fontSize:11, fontWeight:600, color: mode==='employer' ? 'var(--green)' : '#a78bfa', marginTop:6 }}>
              ↑ {liveCount > 0 ? 'Updates as you type' : 'Grows with each step'}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {[
            mode === 'employer'
              ? { dot:'var(--green)', text:<>DNA matching is <strong style={{color:'var(--text)'}}>active</strong> — updating as you configure.</>}
              : { dot:'var(--green)', text:<><strong style={{color:'var(--text)'}}>4,200+</strong> verified companies hiring on Hiro right now.</>},
            mode === 'employer'
              ? { dot:'var(--cyan)', text:<>Employers fill roles <strong style={{color:'var(--text)'}}>3× faster</strong> than LinkedIn on average.</>}
              : { dot:'var(--cyan)', text:<>Candidates get <strong style={{color:'var(--text)'}}>3× more</strong> relevant interviews vs LinkedIn.</>},
            mode === 'employer'
              ? { dot:'#a78bfa', text:<>First <strong style={{color:'var(--text)'}}>30 days free</strong>. No placement fees. Subscription only.</>}
              : { dot:'#a78bfa', text:<>No recruiters. <strong style={{color:'var(--text)'}}>Direct to hiring manager</strong> on every match.</>},
          ].map((b, i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:12, color:'var(--text2)', lineHeight:1.5 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, marginTop:5, background:b.dot }} />
              <span>{b.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Card preview */}
      <div className="ob-preview-widget">
        <div className="ob-preview-label">{mode === 'employer' ? 'Your Company Card Preview' : 'Your Candidate Card Preview'}</div>
        <div className="ob-preview-card">
          <div className="ob-preview-banner" />
          <div className="ob-preview-body">
            <div className="ob-preview-logo">{mode === 'employer' ? '🏢' : '👤'}</div>
            <div className="ob-preview-co">
              {mode === 'employer' ? (companyName || 'Your company') : (firstName ? `${firstName} ${lastName}`.trim() : 'Your name')}
            </div>
            <div className="ob-preview-meta">
              {mode === 'employer'
                ? [industry, companyStage].filter(Boolean).join(' · ') || 'Industry · Stage'
                : [title, location].filter(Boolean).join(' · ') || 'Title · Location'
              }
            </div>
            <div className="ob-preview-score">
              <strong>—</strong> Hiro Score™
            </div>
          </div>
        </div>
      </div>

      {/* Trust box */}
      <div className="trust-box" style={{ padding:'14px 16px', background: mode==='employer' ? 'var(--teal-lt)' : 'var(--green-lt)', border:`1px solid ${mode==='employer' ? 'rgba(13,148,136,.2)' : 'rgba(34,197,94,.15)'}`, borderRadius:12, fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>
        <strong style={{ color: mode==='employer' ? 'var(--text)' : 'var(--green)' }}>Built for mutual trust.</strong>{' '}
        {mode === 'employer'
          ? 'Hiro verifies every company before they can contact candidates. No cold outreach without a mutual match.'
          : 'Your data, your control. Hiro never shares your profile without a mutual match signal.'
        }
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function OnboardingView() {
  const { createProfile } = useAuth();
  const matchTriggeredRef = useRef(false);

  const [phase,       setPhase]       = useState('role');
  const [mode,        setMode]        = useState(null);
  const [name,        setName]        = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState(null);
  const [step,        setStep]        = useState(1);
  const [completed,   setCompleted]   = useState([]);

  // ── Candidate fields ──────────────────────────
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [title,       setTitle]       = useState('');
  const [experience,  setExperience]  = useState('6–10 years');
  const [location,    setLocation]    = useState('');
  const [linkedIn,    setLinkedIn]    = useState('');

  // Work experience entries
  const makeExp = (id) => ({
    id, title:'', company:'', location:'',
    startYear: new Date().getFullYear() - 2,
    endYear:   new Date().getFullYear(),
    isCurrent: false, description: '', skills: [],
  });
  const [experiences, setExperiences] = useState([makeExp(1)]);

  const addExperience = () => setExperiences(p => [...p, makeExp(p.length + 1)]);
  const updateExp = (id, field, val) => setExperiences(p => p.map(e => e.id === id ? { ...e, [field]: val } : e));
  const removeExp = (id) => setExperiences(p => p.filter(e => e.id !== id));

  // Skills
  const [skills,          setSkills]          = useState([]);
  const [aiSkills,        setAiSkills]        = useState([]);
  const [loadingAiSkills, setLoadingAiSkills] = useState(false);
  const [customSkill,     setCustomSkill]     = useState('');

  // DNA (7-dim)
  const [dna, setDna] = useState(defaultDna());
  const updateDna = (idx, val) => setDna(p => { const n=[...p]; n[idx]=val; return n; });

  // Preferences
  const [salary,  setSalary]  = useState(120);
  const [stage,   setStage]   = useState('Series A–C');
  const [notice,  setNotice]  = useState('1 month');

  // ── Employer fields ───────────────────────────
  const [companyName,  setCompanyName]  = useState('');
  const [website,      setWebsite]      = useState('');
  const [industry,     setIndustry]     = useState('');
  const [companyStage, setCompanyStage] = useState('');
  const [companySize,  setCompanySize]  = useState('');
  const [companyDesc,  setCompanyDesc]  = useState('');
  const [companyLoc,   setCompanyLoc]   = useState('');
  const [cultureTags,  setCultureTags]  = useState([]);
  const [workModel,    setWorkModel]    = useState('');
  const [intensity,    setIntensity]    = useState('');
  const [roles,        setRoles]        = useState([{ id:1, title:'', function:'Product', seniority:'Senior IC', minSal:'90k', maxSal:'120k' }]);
  const [trustSettings, setTrustSettings] = useState({
    receiveReviews: true, bidirectional: true, disputeWindow: false,
    showSalary: true, dnaMatching: true,
  });

  const addRole = () => setRoles(p => [...p, { id:p.length+1, title:'', function:'Engineering', seniority:'Lead / Staff', minSal:'80k', maxSal:'120k' }]);
  const updateRole = (id, field, val) => setRoles(p => p.map(r => r.id===id ? {...r, [field]:val} : r));
  const toggleCultureTag = (t) => setCultureTags(p => p.includes(t) ? p.filter(x=>x!==t) : [...p,t]);
  const toggleSkill = (s) => setSkills(p => p.includes(s) ? p.filter(x=>x!==s) : [...p,s]);
  const toggleTrust = (k) => setTrustSettings(p => ({...p, [k]:!p[k]}));

  // ── Firestore match pool ──────────────────────
  const [allJobs,       setAllJobs]       = useState([]);
  const [allCandidates, setAllCandidates] = useState([]);
  const [liveCount,     setLiveCount]     = useState(0);

  useEffect(() => {
    if (mode !== 'candidate') return;
    getDocs(query(collection(db, 'jobs'), where('status','==','live')))
      .then(snap => setAllJobs(snap.docs.map(d=>({id:d.id,...d.data()}))))
      .catch(console.error);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'employer') return;
    getDocs(query(collection(db, 'users'), where('mode','==','candidate')))
      .then(snap => setAllCandidates(snap.docs.map(d=>({id:d.id,...d.data()}))))
      .catch(console.error);
  }, [mode]);

  // Real-time candidate match count for employers
  const empMatchCount = useMemo(() => {
    if (mode !== 'employer') return 0;
    const titleKeywords = roles.flatMap(r => r.title.toLowerCase().split(/\s+/).filter(w=>w.length>3));
    const minSalNum = (s) => parseInt((s||'0').replace(/[^0-9]/g,'')) || 0;
    return allCandidates.filter(c => {
      // title keyword overlap
      const candTitle = (c.job_title||'').toLowerCase();
      if (titleKeywords.length > 0 && !titleKeywords.some(k => candTitle.includes(k))) return false;
      // DNA overlap
      if (c.dna && dna) {
        const score = calcDnaScore(c.dna, dna);
        if (score < 45) return false;
      }
      // salary range overlap
      const roleSals = roles.map(r => ({ min:minSalNum(r.minSal), max:minSalNum(r.maxSal) }));
      if (c.target_salary && roleSals.some(rs => rs.min > 0)) {
        const inRange = roleSals.some(rs => c.target_salary <= rs.max * 1.1);
        if (!inRange) return false;
      }
      return true;
    }).length;
  }, [allCandidates, mode, roles, dna]);

  // Real-time job match count for candidates
  const candMatchCount = useMemo(() => {
    if (mode !== 'candidate') return 0;
    return allJobs.filter(job => {
      if (title.trim().length > 2) {
        const titleMatch = (job.title||'').toLowerCase().includes(title.toLowerCase())
          || title.toLowerCase().includes((job.title||'').toLowerCase().split(' ')[0]);
        if (!titleMatch) return false;
      }
      if (job.salMax && salary > job.salMax * 1.15) return false;
      if (skills.length > 0 && job.mustSkills?.length > 0) {
        if (!skills.some(s => job.mustSkills.map(x=>x.toLowerCase()).includes(s.toLowerCase()))) return false;
      }
      if (job.dna && dna) {
        if (calcDnaScore(dna, job.dna) < 45) return false;
      }
      if (location && job.location && !job.location.toLowerCase().includes(location.toLowerCase().split(',')[0])) {
        if (job.workModel !== 'Remote-first') return false;
      }
      return true;
    }).length;
  }, [allJobs, mode, title, salary, skills, dna, location]);

  // Update live count with a small animation delay
  useEffect(() => {
    const count = mode === 'employer' ? empMatchCount : candMatchCount;
    const timer = setTimeout(() => setLiveCount(count), 400);
    return () => clearTimeout(timer);
  }, [empMatchCount, candMatchCount, mode]);

  // Step-based baseline counts (shown before live data is ready)
  const baseMatchCount = useMemo(() => {
    const emp = [200, 300, 450, 580, 650];
    const cand = [24, 55, 110, 175, 210, 247];
    const arr = mode === 'employer' ? emp : cand;
    return arr[Math.min(step-1, arr.length-1)];
  }, [mode, step]);

  // AI skill suggestions
  const generateAiSkills = useCallback(async () => {
    const ai = getGeminiClient(); if (!ai) return;
    setLoadingAiSkills(true);
    try {
      const expContext = experiences.filter(e=>e.title||e.description).map(e=>`${e.title} at ${e.company}: ${e.description}`).join('. ');
      const prompt = `Suggest 8-10 professional skills for a "${title}" professional${expContext ? ` with this background: ${expContext.slice(0,300)}` : ''}. Return ONLY a comma-separated list of skills, no explanations.`;
      const response = await ai.models.generateContent({ model:'gemini-2.0-flash', contents: prompt });
      const text = response.text || '';
      setAiSkills(text.split(',').map(s=>s.trim()).filter(s=>s.length>0&&s.length<40));
    } catch (err) { console.error('AI skills failed:', err); }
    finally { setLoadingAiSkills(false); }
  }, [title, experiences]);

  useEffect(() => {
    if (step === 3 && mode === 'candidate' && title.length > 2 && aiSkills.length === 0) {
      generateAiSkills();
    }
  }, [step, title, mode, aiSkills.length, generateAiSkills]);

  const recommendedSkills = useMemo(() => {
    if (!title) return [];
    const key = Object.keys(ROLE_SKILLS_DB).find(k => title.toLowerCase().includes(k.toLowerCase()));
    return key ? ROLE_SKILLS_DB[key] : [];
  }, [title]);

  const currentArchetype = getArchetype(dna);
  const steps = mode === 'employer' ? EMP_STEPS : CAND_STEPS;
  const currentStepConfig = steps[step-1];

  const trajectory = useMemo(() => calcCareerTrajectory(experiences), [experiences]);

  const advance = (to) => {
    if (to > step) setCompleted(p => p.includes(step) ? p : [...p,step]);
    setStep(to);
    window.scrollTo?.(0,0);
  };

  async function handleRoleSelect() {
    if (!mode || !name.trim()) return;
    setError(null);
    const parts = name.trim().split(' ');
    setFirstName(parts[0]||'');
    setLastName(parts.slice(1).join(' ')||'');
    setPhase('wizard');
    setStep(1);
    setCompleted([]);
  }

  async function handleGoLive() {
    try {
      setSubmitting(true);
      setError(null);
      const fullName = `${firstName} ${lastName}`.trim() || name.trim();
      let additionalData = {};
      if (mode === 'candidate') {
        additionalData = {
          first_name: firstName, last_name: lastName, job_title: title,
          experience_years: experience, location, linkedin: linkedIn,
          work_experience: experiences,
          career_trajectory: trajectory,
          skills, dna, archetype: currentArchetype.name,
          target_salary: salary, company_stage: stage, notice_period: notice,
        };
      } else {
        additionalData = {
          first_name: firstName, last_name: lastName,
          company_name: companyName, website, industry,
          company_stage: companyStage, company_size: companySize,
          company_description: companyDesc, hq_location: companyLoc,
          culture_tags: cultureTags, work_model: workModel,
          intensity_level: intensity, team_dna: dna,
          open_roles: roles, trust_settings: trustSettings,
        };
      }
      const { data: newProfile, error: err } = await createProfile(mode, fullName, additionalData);
      if (err) { setError(err.message); setSubmitting(false); return; }

      // Fan out match scores once after onboarding completes — guard prevents double-fire
      if (mode === 'candidate' && additionalData.dna && newProfile?.id && !matchTriggeredRef.current) {
        matchTriggeredRef.current = true;
        setTimeout(() => {
          fanOutCandidateMatches({ ...additionalData, id: newProfile.id }).catch(e =>
            console.warn('[MatchEngine] onboarding fan-out error:', e)
          );
        }, 1500);
      }
    } catch (err) {
      console.error('Onboarding error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  /* ── PHASE 1: Role selector ─────────────────── */
  if (phase === 'role') {
    return (
      <div className="auth-screen">
        <div className="auth-card onboarding-card">
          <div className="auth-logo">
            <span className="logo-text">hiro</span>
            <span className="logo-dot" />
          </div>
          <h1 className="auth-title">I am here to…</h1>
          <p className="auth-sub">Choose how you want to use Hiro</p>
          <div className="mode-cards">
            <button className={`mode-card${mode==='candidate'?' active':''}`} onClick={()=>setMode('candidate')}>
              <span className="mode-icon">🚀</span>
              <span className="mode-label">Find my next role</span>
              <span className="mode-desc">Match to opportunities by who I am, not just my CV</span>
            </button>
            <button className={`mode-card${mode==='employer'?' active':''}`} onClick={()=>setMode('employer')}>
              <span className="mode-icon">🏢</span>
              <span className="mode-label">Hire great people</span>
              <span className="mode-desc">DNA-matched candidates that actually fit your culture</span>
            </button>
          </div>
          <input className="inp" placeholder="Your full name" value={name} onChange={e=>setName(e.target.value)} style={{ marginTop:8 }} />
          {error && <p className="auth-error">{error}</p>}
          <button className="btn-primary" onClick={handleRoleSelect} disabled={submitting||!mode||!name.trim()} style={{ marginTop:4 }}>
            {submitting ? 'Setting up…' : 'Continue →'}
          </button>
        </div>
      </div>
    );
  }

  /* ── PHASE 2: Wizard ────────────────────────── */
  return (
    <div className="onboard-shell">
      <StepSidebar
        step={step} completed={completed} steps={steps} mode={mode}
        archetype={currentArchetype}
        showArchetype={mode === 'candidate' && step >= 4}
      />

      <div className="onboard-main">
        <div className="onboard-content-area">

          {/* Progress bar */}
          <div className="ob-top-bar">
            <div className="ob-top-bar-fill" style={{ width:`${(step/steps.length)*100}%` }} />
          </div>

          <div className="onboard-content-scroll">

            {/* ══════════════════════════════════════
                CANDIDATE WIZARD
            ══════════════════════════════════════ */}
            {mode === 'candidate' && (
              <>
                {/* Step 1 — Identity */}
                {step === 1 && (
                  <div className="ob-step active">
                    <div className="ob-step-header">
                      <div className="ob-step-eyebrow">Step 1 of 6 · Identity</div>
                      <div className="ob-step-title">Who are <span>you?</span></div>
                      <div className="ob-step-desc">The basics that anchor your profile. Takes 60 seconds — sets the foundation for every match.</div>
                    </div>
                    <div className="ob-card">
                      <div className="ob-card-title">Personal details</div>
                      <div className="ob-card-sub">Your name and location help employers know who they're talking to.</div>
                      {/* Avatar upload row */}
                      <div className="ob-upload-row" style={{ marginBottom:20 }}>
                        <div className="ob-upload-logo" style={{ cursor:'pointer', borderRadius:'50%' }}>
                          <div className="ob-upload-logo-icon">👤</div>
                          <span style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>Photo</span>
                          <small style={{ fontSize:10, color:'var(--text3)' }}>PNG · JPG</small>
                        </div>
                        <div style={{ flex:1 }}>
                          <div className="ob-field-label">Profile photo</div>
                          <p style={{ fontSize:12, color:'var(--text3)', lineHeight:1.6, marginBottom:8 }}>Optional. Adds a human touch. Only shown to matched employers after mutual interest.</p>
                          <button style={{ padding:'7px 14px', background:'transparent', border:'1px solid var(--border2)', borderRadius:'var(--rp)', fontSize:12, fontWeight:600, color:'var(--text2)', cursor:'pointer', fontFamily:'inherit' }}>Upload photo</button>
                        </div>
                      </div>
                      <div className="ob-field-row">
                        <div className="ob-field">
                          <label className="ob-field-label">First name</label>
                          <input type="text" className="inp" value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="Jordan" />
                        </div>
                        <div className="ob-field">
                          <label className="ob-field-label">Last name</label>
                          <input type="text" className="inp" value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Mitchell" />
                        </div>
                      </div>
                      <div className="ob-field">
                        <label className="ob-field-label">Current title</label>
                        <input type="text" className="inp" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Senior Product Manager" />
                      </div>
                      <div className="ob-field-row">
                        <div className="ob-field">
                          <label className="ob-field-label">Years of experience</label>
                          <select className="sel" value={experience} onChange={e=>setExperience(e.target.value)}>
                            {['0–2 years','2–4 years','4–6 years','6–10 years','10+ years'].map(o=><option key={o}>{o}</option>)}
                          </select>
                        </div>
                        <div className="ob-field">
                          <label className="ob-field-label">Location</label>
                          <LocationAutocomplete value={location} onChange={setLocation} placeholder="London, UK" />
                        </div>
                      </div>
                      <div className="ob-field" style={{ marginBottom:0 }}>
                        <label className="ob-field-label">LinkedIn URL</label>
                        <input type="url" className="inp" value={linkedIn} onChange={e=>setLinkedIn(e.target.value)} placeholder="linkedin.com/in/yourname" />
                      </div>
                    </div>
                    {/* CV upload */}
                    <div className="ob-card">
                      <div className="ob-card-title">CV / Résumé <span style={{ fontSize:11, color:'var(--text3)', fontWeight:400, marginLeft:6 }}>Optional — we'll auto-fill fields below</span></div>
                      <div className="ob-card-sub">We parse your CV to pre-populate skills and experience. Nothing is stored beyond your profile.</div>
                      <div style={{ border:'1.5px dashed var(--border2)', borderRadius:'var(--r)', padding:'28px 20px', textAlign:'center', cursor:'pointer', transition:'all .15s' }}
                        onMouseEnter={e=>e.currentTarget.style.borderColor='var(--violet)'}
                        onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border2)'}>
                        <div style={{ fontSize:28, marginBottom:8 }}>📄</div>
                        <div style={{ fontSize:13, fontWeight:700, color:'var(--violet)', marginBottom:4 }}>Drop your CV here</div>
                        <div style={{ fontSize:12, color:'var(--text3)' }}>PDF, DOCX, or TXT · Max 5MB</div>
                      </div>
                      <div style={{ textAlign:'center', color:'var(--text3)', fontSize:12, margin:'12px 0' }}>— or paste a summary —</div>
                      <textarea className="inp" placeholder="Paste a short bio or work summary. Hiro will extract key information automatically…" rows={3} style={{ resize:'vertical', width:'100%' }} />
                    </div>
                  </div>
                )}

                {/* Step 2 — Work Experience */}
                {step === 2 && (
                  <div className="ob-step active">
                    <div className="ob-step-header">
                      <div className="ob-step-eyebrow">Step 2 of 6 · Career History</div>
                      <div className="ob-step-title">Where have you <span>worked?</span></div>
                      <div className="ob-step-desc">Your trajectory matters as much as your CV. Start with your most recent role and work backwards.</div>
                    </div>
                    <div className="ob-card">
                      <div className="ob-card-title">Work experience</div>
                      <div className="ob-card-sub">Add your last 2–3 roles. Descriptions help Hiro suggest the right skills on the next step.</div>
                      {experiences.map((exp, i) => (
                        <ExpCard
                          key={exp.id}
                          exp={exp}
                          num={i+1}
                          onChange={(field, val) => updateExp(exp.id, field, val)}
                          onRemove={() => removeExp(exp.id)}
                        />
                      ))}
                      <button
                        onClick={addExperience}
                        style={{ width:'100%', padding:12, background:'transparent', border:'1.5px dashed var(--border2)', borderRadius:'var(--r)', color:'var(--text3)', fontFamily:'inherit', fontSize:13, fontWeight:600, cursor:'pointer', transition:'all .15s', marginTop:4 }}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--violet)';e.currentTarget.style.color='var(--violet)';e.currentTarget.style.background='var(--violet-lt)'}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border2)';e.currentTarget.style.color='var(--text3)';e.currentTarget.style.background='transparent'}}
                      >
                        + Add another role
                      </button>
                    </div>
                    {/* Trajectory insight */}
                    {experiences.some(e=>e.title) && (
                      <div className="ob-card" style={{ background:'rgba(108,71,255,.04)', borderColor:'rgba(108,71,255,.18)' }}>
                        <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                          <span style={{ fontSize:20 }}>📈</span>
                          <div>
                            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--violet)', marginBottom:4 }}>Career trajectory insight</div>
                            <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>
                              <strong style={{ color:'var(--text)' }}>{trajectory.summary}</strong>
                              {trajectory.seniorityDelta > 0 && (
                                <span style={{ marginLeft:8, fontSize:11, padding:'2px 8px', borderRadius:999, background:'var(--green-lt)', border:'1px solid rgba(34,197,94,.2)', color:'var(--green)', fontWeight:700 }}>↑ Upward trajectory</span>
                              )}
                            </div>
                            <div style={{ fontSize:12, color:'var(--text3)', marginTop:6 }}>This trajectory is factored into your match score — companies hiring at your level see you first.</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3 — Skills */}
                {step === 3 && (
                  <div className="ob-step active">
                    <div className="ob-step-header">
                      <div className="ob-step-eyebrow">Step 3 of 6 · Skill graph</div>
                      <div className="ob-step-title">What are your <span>top skills?</span></div>
                      <div className="ob-step-desc">Pick the skills that define your expertise. Quality over quantity.</div>
                    </div>
                    <div className="ob-card">
                      <div className="ob-card-title">Core skills</div>
                      <div className="ob-card-sub">These power your match score. Pick up to 12 that genuinely represent you.</div>
                      <div className="ob-field" style={{ marginBottom:20 }}>
                        <label className="ob-field-label">Add a custom skill</label>
                        <div style={{ display:'flex', gap:8 }}>
                          <input type="text" className="inp" placeholder="e.g. Figma, AWS, Fundraising…"
                            value={customSkill} onChange={e=>setCustomSkill(e.target.value)}
                            onKeyDown={e=>{ if(e.key==='Enter'&&customSkill.trim()){ toggleSkill(customSkill.trim()); setCustomSkill(''); }}} />
                          <button className="btn btn-violet" style={{ padding:'0 16px', flexShrink:0 }}
                            onClick={()=>{ if(customSkill.trim()){ toggleSkill(customSkill.trim()); setCustomSkill(''); }}}>Add</button>
                        </div>
                      </div>
                      <div className="ob-tag-grid">
                        {ALL_SKILLS.map(s => (
                          <div key={s} className={`ob-tag${skills.includes(s)?' selected':''}`} onClick={()=>toggleSkill(s)}>{s}</div>
                        ))}
                        {skills.filter(s=>!ALL_SKILLS.includes(s)&&!recommendedSkills.includes(s)&&!aiSkills.includes(s)).map(s => (
                          <div key={s} className="ob-tag selected" onClick={()=>toggleSkill(s)}>{s}</div>
                        ))}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:8 }}>
                        <span style={{ fontWeight:700, color:skills.length>0?'var(--green)':'var(--text3)' }}>{skills.length}</span> selected · aim for 5–12 for best matches
                      </div>

                      {(recommendedSkills.length > 0 || aiSkills.length > 0) && (
                        <div style={{ marginTop:24 }}>
                          <div style={{ height:1, background:'var(--border)', margin:'0 0 16px' }} />
                          <div className="ob-card-title" style={{ fontSize:12, color:'var(--text3)', marginBottom:10 }}>
                            {loadingAiSkills ? '✨ Analysing your background…' : aiSkills.length > 0 ? '✨ AI-suggested from your experience' : 'Recommended for your role'}
                          </div>
                          <div className="ob-tag-grid">
                            {[...new Set([...recommendedSkills,...aiSkills])].filter(s=>!ALL_SKILLS.includes(s)).map(s => (
                              <div key={s} className={`ob-tag${skills.includes(s)?' selected':''}`} onClick={()=>toggleSkill(s)}>{s}</div>
                            ))}
                            {loadingAiSkills && <div className="ob-tag" style={{ opacity:.5 }}>Generating…</div>}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="ob-card">
                      <div className="ob-card-title">Function & domain</div>
                      <div className="ob-card-sub">Narrows your matches to the right types of roles.</div>
                      <div className="ob-field-row">
                        <div className="ob-field">
                          <label className="ob-field-label">Primary function</label>
                          <select className="sel">
                            <option value="">Select…</option>
                            {['Product','Engineering','Design','Data & Analytics','Marketing','Sales','Operations','Finance','People & HR'].map(o=><option key={o}>{o}</option>)}
                          </select>
                        </div>
                        <div className="ob-field">
                          <label className="ob-field-label">Seniority level</label>
                          <select className="sel">
                            <option>Individual Contributor</option><option>Senior IC / Lead</option>
                            <option>Staff / Principal</option><option>Manager</option>
                            <option>Director</option><option>VP / Head of</option><option>C-Suite</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4 — Work DNA */}
                {step === 4 && (
                  <div className="ob-step active">
                    <div className="ob-step-header">
                      <div className="ob-step-eyebrow">Step 4 of 6 · Work DNA™</div>
                      <div className="ob-step-title">How do you <span>actually work?</span></div>
                      <div className="ob-step-desc">~2 minutes. Honest answers get better matches. Employers see your archetype, not your raw sliders.</div>
                    </div>
                    <div className="ob-card">
                      <div className="ob-card-title">Work DNA™ — {DNA_DIMENSIONS.length} dimensions</div>
                      <div className="ob-card-sub">Drag each slider to reflect how you genuinely operate, not how you'd like to appear.</div>
                      {DNA_DIMENSIONS.map((d,i) => (
                        <DnaSlider key={i} dim={d} index={i} value={dna[i]} onChange={updateDna} accentColor="#a78bfa" />
                      ))}
                      {/* Archetype card */}
                      <div className="ob-archetype-card" style={{ marginTop:20 }}>
                        <div className="ob-archetype-top">
                          <span className="ob-archetype-emoji">{currentArchetype.emoji}</span>
                          <div>
                            <div className="ob-archetype-name">Your Archetype: {currentArchetype.name}</div>
                            <div className="ob-archetype-sub">{currentArchetype.traits.join(' · ')}</div>
                          </div>
                        </div>
                        <div className="ob-archetype-desc">{currentArchetype.desc}</div>
                        <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
                          {currentArchetype.bestFit.map(f => (
                            <span key={f} style={{ fontSize:11, padding:'2px 9px', borderRadius:999, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', color:'var(--text2)' }}>✓ {f}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5 — Preferences */}
                {step === 5 && (
                  <div className="ob-step active">
                    <div className="ob-step-header">
                      <div className="ob-step-eyebrow">Step 5 of 6 · What you want</div>
                      <div className="ob-step-title">Your ideal <span>next role</span></div>
                      <div className="ob-step-desc">This sets your matching filters. Employers won't see your exact targets — only whether you're in range.</div>
                    </div>
                    <div className="ob-card">
                      <div className="ob-card-title">Compensation</div>
                      <div className="ob-card-sub">Private — only used for matching. Employers see only whether you're in range.</div>
                      <div className="ob-field">
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                          <label className="ob-field-label">Target salary (annual base, GBP)</label>
                          <span style={{ color:'var(--violet)', fontWeight:800, fontSize:20, fontFamily:"'JetBrains Mono', monospace" }}>£{salary}k</span>
                        </div>
                        <input type="range" min="30" max="400" step="5" value={salary} onChange={e=>setSalary(+e.target.value)} style={{ width:'100%', accentColor:'var(--violet)' }} />
                        <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:11, color:'var(--text3)' }}>
                          <span>£30k</span><span>£400k+</span>
                        </div>
                      </div>
                      <div className="ob-field-row">
                        <div className="ob-field">
                          <label className="ob-field-label">Company stage</label>
                          <select className="sel" value={stage} onChange={e=>setStage(e.target.value)}>
                            {['Seed','Series A–C','Series D+','Public','Any stage'].map(o=><option key={o}>{o}</option>)}
                          </select>
                        </div>
                        <div className="ob-field">
                          <label className="ob-field-label">Notice period</label>
                          <select className="sel" value={notice} onChange={e=>setNotice(e.target.value)}>
                            {['Immediately','1 month','2 months','3 months','6 months'].map(o=><option key={o}>{o}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="ob-card">
                      <div className="ob-card-title">Role & company preferences</div>
                      <div className="ob-card-sub">What kind of environment do you want to step into?</div>
                      <div className="ob-field" style={{ marginBottom:14 }}>
                        <label className="ob-field-label">Work mode</label>
                        <div className="ob-tag-grid">
                          {['Remote-first','Hybrid','On-site'].map(o=>(
                            <div key={o} className={`ob-tag${skills.includes(o)?'':''}`} onClick={()=>{}}>{o}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 6 — Review */}
                {step === 6 && (
                  <div className="ob-step active">
                    <div className="ob-step-header">
                      <div className="ob-step-eyebrow">Step 6 of 6 · Your fingerprint</div>
                      <div className="ob-step-title">Your fingerprint is <span>ready 🎉</span></div>
                      <div className="ob-step-desc">Here's how matched employers will see you. You can edit any detail from your profile settings.</div>
                    </div>
                    {/* Profile preview */}
                    <div style={{ background:'linear-gradient(135deg,rgba(108,71,255,.1),rgba(12,14,26,.95))', border:'1px solid rgba(108,71,255,.25)', borderRadius:14, padding:20, marginBottom:16 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
                        <div style={{ width:52, height:52, borderRadius:14, background:`linear-gradient(135deg,${currentArchetype.color}80,${currentArchetype.color}40)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:800, color:'#fff', flexShrink:0 }}>
                          {((firstName[0]||'')+(lastName[0]||'')).toUpperCase()||'?'}
                        </div>
                        <div>
                          <div style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>{[firstName,lastName].filter(Boolean).join(' ')||'Your name'}</div>
                          <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>{title||'Job title'} · {location||'Location'}</div>
                          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:6 }}>
                            {skills.slice(0,3).map(s=>(
                              <span key={s} style={{ padding:'3px 9px', borderRadius:999, fontSize:11, fontWeight:600, background:'rgba(108,71,255,.15)', border:'1px solid rgba(108,71,255,.25)', color:'#a78bfa' }}>{s}</span>
                            ))}
                            <span style={{ padding:'3px 9px', borderRadius:999, fontSize:11, fontWeight:600, background:`${currentArchetype.color}18`, border:`1px solid ${currentArchetype.color}35`, color:currentArchetype.color }}>🧬 {currentArchetype.name}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                        {[
                          { val:'94%', lbl:'Profile strength', col:'var(--text)' },
                          { val:skills.length, lbl:'Skills', col:'var(--cyan)' },
                          { val:'🧬', lbl:'DNA active', col:'#f9a8d4' },
                          { val:`£${salary}k`, lbl:'Target', col:'var(--green)' },
                        ].map(s=>(
                          <div key={s.lbl} style={{ textAlign:'center', padding:'10px 6px', background:'rgba(255,255,255,.04)', border:'1px solid var(--border)', borderRadius:'var(--r)' }}>
                            <div style={{ fontSize:18, fontWeight:800, lineHeight:1, color:s.col }}>{s.val}</div>
                            <div style={{ fontSize:10, color:'var(--text3)', marginTop:3 }}>{s.lbl}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Summary rows */}
                    {[
                      { icon:'👤', label:`${[firstName,lastName].filter(Boolean).join(' ')||'Name'}`, detail:`${title||'—'} · ${location||'—'}`, ok: !!firstName },
                      { icon:'💼', label:`${experiences.filter(e=>e.title).length} role${experiences.filter(e=>e.title).length!==1?'s':''} · ${trajectory.summary}`, detail: trajectory.seniorityDelta > 0 ? '↑ Upward trajectory detected' : 'Trajectory calculated', ok:true },
                      { icon:'⚡', label:`${skills.length} skill${skills.length!==1?'s':''} selected`, detail:skills.slice(0,3).join(', ')||'No skills yet', ok:skills.length>=3 },
                      { icon:'🧬', label:`Work DNA™ · ${currentArchetype.name}`, detail:currentArchetype.traits.slice(0,2).join(' · '), ok:true },
                      { icon:'💷', label:`Target: £${salary}k · ${stage}`, detail:`${notice} notice · DNA matching active`, ok:true },
                    ].map((row,i,arr) => (
                      <div key={i} className="ob-summary-row">
                        <span className="ob-summary-icon">{row.icon}</span>
                        <div style={{ flex:1 }}>
                          <div className="ob-summary-text"><strong>{row.label}</strong></div>
                          <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{row.detail}</div>
                        </div>
                        <span style={{ fontSize:11, padding:'2px 9px', borderRadius:999, fontWeight:700, flexShrink:0,
                          background:row.ok?'var(--green-lt)':'rgba(245,158,11,.08)',
                          color:row.ok?'var(--green)':'var(--amber)',
                          border:`1px solid ${row.ok?'rgba(34,197,94,.2)':'rgba(245,158,11,.2)'}` }}>
                          {row.ok?'✓ Ready':'⚠ Add more'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ══════════════════════════════════════
                EMPLOYER WIZARD
            ══════════════════════════════════════ */}
            {mode === 'employer' && (
              <>
                {/* Step 1 — Company */}
                {step === 1 && (
                  <div className="ob-step active">
                    <div className="ob-step-header">
                      <div className="ob-step-eyebrow">Step 1 of 5 · Company Identity</div>
                      <div className="ob-step-title">Tell us about your <span>company.</span></div>
                      <div className="ob-step-desc">This becomes your verified company profile — visible to matched candidates who have already expressed interest.</div>
                    </div>
                    <div className="ob-card">
                      <div className="ob-card-title">Company identity</div>
                      <div className="ob-card-sub">Your logo and banner are shown to candidates before they decide to match. Make it honest.</div>
                      <div className="ob-upload-row">
                        <div className="ob-upload-logo">
                          <div className="ob-upload-logo-icon">🏢</div>
                          <span style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>Logo</span>
                          <small style={{ fontSize:10, color:'var(--text3)' }}>PNG / SVG</small>
                        </div>
                        <div className="ob-upload-banner">
                          <span>Click to upload banner image</span>
                          <small>JPG, PNG or WebP · 1400×400px recommended</small>
                          <small style={{ color:'var(--text3)', fontSize:10 }}>Used as your company cover — shown to all candidates</small>
                        </div>
                      </div>
                      <div className="ob-field-row">
                        <div className="ob-field">
                          <label className="ob-field-label">Company name</label>
                          <input type="text" className="inp" value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="e.g. Monzo, Figma, Stripe…" />
                        </div>
                        <div className="ob-field">
                          <label className="ob-field-label">Website</label>
                          <input type="url" className="inp" value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://yourcompany.com" />
                        </div>
                      </div>
                      <div className="ob-field-row-3">
                        <div className="ob-field">
                          <label className="ob-field-label">Industry</label>
                          <select className="sel" value={industry} onChange={e=>setIndustry(e.target.value)}>
                            <option value="">Select…</option>
                            {['Fintech','SaaS / B2B','AI / ML','Marketplace','Developer Tools','Healthcare Tech','E-commerce','Other'].map(o=><option key={o}>{o}</option>)}
                          </select>
                        </div>
                        <div className="ob-field">
                          <label className="ob-field-label">Company stage</label>
                          <select className="sel" value={companyStage} onChange={e=>setCompanyStage(e.target.value)}>
                            <option value="">Select…</option>
                            {['Pre-seed','Seed','Series A','Series B','Series C+','Public / Post-IPO'].map(o=><option key={o}>{o}</option>)}
                          </select>
                        </div>
                        <div className="ob-field">
                          <label className="ob-field-label">Headcount</label>
                          <select className="sel" value={companySize} onChange={e=>setCompanySize(e.target.value)}>
                            <option value="">Select…</option>
                            {['1–10','11–50','51–200','201–500','500+'].map(o=><option key={o}>{o}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="ob-field">
                        <label className="ob-field-label">HQ Location</label>
                        <input type="text" className="inp" value={companyLoc} onChange={e=>setCompanyLoc(e.target.value)} placeholder="e.g. London, UK" />
                      </div>
                      <div className="ob-field" style={{ marginBottom:0 }}>
                        <label className="ob-field-label">Company description</label>
                        <textarea className="inp" value={companyDesc} onChange={e=>setCompanyDesc(e.target.value.slice(0,500))}
                          placeholder="Write a short description of what your company does, what makes it unique, and why someone should want to work here. Be honest — candidates respond better to authenticity than marketing copy."
                          rows={4} style={{ resize:'vertical', width:'100%' }} />
                        <div style={{ fontSize:11, color:'var(--text3)', textAlign:'right', marginTop:4 }}>{companyDesc.length} / 500</div>
                      </div>
                      <p style={{ fontSize:12, color:'var(--text3)', marginTop:8 }}>All fields are verified by Hiro before your profile goes live — no fake companies, ever.</p>
                    </div>
                  </div>
                )}

                {/* Step 2 — Culture */}
                {step === 2 && (
                  <div className="ob-step active">
                    <div className="ob-step-header">
                      <div className="ob-step-eyebrow">Step 2 of 5 · Culture Fingerprint</div>
                      <div className="ob-step-title">What's it actually like <span>to work here?</span></div>
                      <div className="ob-step-desc">Be honest — candidates who fit your culture retain 3× longer.</div>
                    </div>
                    <div className="ob-card">
                      <div className="ob-card-title">Culture fingerprint</div>
                      <div className="ob-card-sub">Select all that genuinely apply. Candidates appreciate honesty over marketing copy.</div>
                      <label className="ob-field-label">What describes your team culture?</label>
                      <div className="ob-tag-grid">
                        {CULTURE_TAGS.map(t=>(
                          <div key={t} className={`ob-tag${cultureTags.includes(t)?' selected':''}`} onClick={()=>toggleCultureTag(t)}>{t}</div>
                        ))}
                      </div>
                      <div style={{ height:1, background:'var(--border)', margin:'20px 0' }} />
                      <div className="ob-field-row">
                        <div className="ob-field">
                          <label className="ob-field-label">Work model</label>
                          <select className="sel" value={workModel} onChange={e=>setWorkModel(e.target.value)}>
                            <option value="">Select…</option>
                            <option>Remote-first</option><option>Hybrid (2–3 days)</option><option>Office-first</option><option>Fully in-office</option>
                          </select>
                        </div>
                        <div className="ob-field">
                          <label className="ob-field-label">Intensity level</label>
                          <select className="sel" value={intensity} onChange={e=>setIntensity(e.target.value)}>
                            <option value="">Select…</option>
                            <option>Relaxed — sustainable pace</option><option>Balanced — focused but healthy</option>
                            <option>High-intensity — fast-moving</option><option>Startup-mode — all-in</option>
                          </select>
                        </div>
                      </div>
                      <p style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>Culture tags improve self-selection and reduce wasted interviews by up to 40%.</p>
                    </div>
                  </div>
                )}

                {/* Step 3 — Team DNA */}
                {step === 3 && (
                  <div className="ob-step active">
                    <div className="ob-step-header">
                      <div className="ob-step-eyebrow">Step 3 of 5 · Team Work DNA™</div>
                      <div className="ob-step-title">How does your team <span>actually work?</span></div>
                      <div className="ob-step-desc">Set the working-style target for your ideal hire. Candidates are matched against this — not just their CV.</div>
                    </div>
                    <div className="ob-card">
                      <div className="ob-card-title">Team DNA™ profile</div>
                      <div className="ob-card-sub">Drag each slider to reflect how your team works today — or how you want your ideal hire to work.</div>
                      {DNA_DIMENSIONS.map((d,i) => (
                        <DnaSlider key={i} dim={d} index={i} value={dna[i]} onChange={updateDna} accentColor="var(--teal)" />
                      ))}
                      {/* Team archetype card — matching HTML mockup exactly */}
                      <div className="ob-archetype-card" style={{ marginTop:20 }}>
                        <div className="ob-archetype-top">
                          <span className="ob-archetype-emoji">{currentArchetype.emoji}</span>
                          <div>
                            <div className="ob-archetype-name">Team Archetype: {currentArchetype.name}</div>
                            <div className="ob-archetype-sub">{currentArchetype.traits.join(' · ')}</div>
                          </div>
                        </div>
                        <div className="ob-archetype-desc">{currentArchetype.desc}</div>
                        <div style={{ marginTop:10, padding:'10px 0 0', borderTop:'1px solid var(--border)' }}>
                          <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6 }}>Best matched candidates come from</div>
                          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                            {currentArchetype.bestFit.map(f=>(
                              <span key={f} style={{ fontSize:11, padding:'2px 9px', borderRadius:999, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', color:'var(--text2)' }}>✓ {f}</span>
                            ))}
                          </div>
                        </div>
                        {currentArchetype.watchOut && (
                          <div style={{ marginTop:10, fontSize:11, color:'var(--amber)', opacity:.8 }}>⚠ {currentArchetype.watchOut}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4 — Open Roles */}
                {step === 4 && (
                  <div className="ob-step active">
                    <div className="ob-step-header">
                      <div className="ob-step-eyebrow">Step 4 of 5 · Open Roles</div>
                      <div className="ob-step-title">Which roles are you <span>hiring for?</span></div>
                      <div className="ob-step-desc">Add your open roles with salary bands. Verified salary data increases inbound quality by 62%.</div>
                    </div>
                    <div className="ob-card">
                      <div className="ob-card-title">Open roles</div>
                      <div className="ob-card-sub">Candidates only see roles where their salary target overlaps. No time wasted for either side.</div>
                      {roles.map((r, idx) => (
                        <div key={r.id} className="ob-role-card">
                          <div className="ob-role-header">
                            <div className="ob-role-num">{idx+1}</div>
                            <input className="inp ob-role-title-input" type="text" value={r.title}
                              onChange={e=>updateRole(r.id,'title',e.target.value)}
                              placeholder="Role title e.g. Senior Product Manager"
                              style={{ background:'transparent', border:'none', outline:'none', fontWeight:700 }} />
                          </div>
                          <div className="ob-field-row" style={{ marginBottom:12 }}>
                            <div className="ob-field" style={{ marginBottom:0 }}>
                              <label className="ob-field-label">Function</label>
                              <select className="sel" value={r.function} onChange={e=>updateRole(r.id,'function',e.target.value)}>
                                {['Product','Engineering','Design','Data','Finance','Marketing','Sales','Operations'].map(o=><option key={o}>{o}</option>)}
                              </select>
                            </div>
                            <div className="ob-field" style={{ marginBottom:0 }}>
                              <label className="ob-field-label">Seniority</label>
                              <select className="sel" value={r.seniority} onChange={e=>updateRole(r.id,'seniority',e.target.value)}>
                                {['Junior IC','Senior IC','Lead / Staff','Manager','Director'].map(o=><option key={o}>{o}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="ob-salary-row">
                            <span className="ob-salary-label">Salary band</span>
                            <input className="inp ob-salary-input" type="text" value={r.minSal} onChange={e=>updateRole(r.id,'minSal',e.target.value)} placeholder="£80k" />
                            <span style={{ color:'var(--text3)', fontSize:13 }}>—</span>
                            <input className="inp ob-salary-input" type="text" value={r.maxSal} onChange={e=>updateRole(r.id,'maxSal',e.target.value)} placeholder="£120k" />
                            <span style={{ marginLeft:6, fontSize:11, color:'var(--text3)' }}>+ equity</span>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={addRole}
                        style={{ width:'100%', padding:12, background:'transparent', border:'1.5px dashed var(--border2)', borderRadius:'var(--r)', color:'var(--text3)', fontFamily:'inherit', fontSize:13, fontWeight:600, cursor:'pointer', transition:'all .15s', marginTop:4 }}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--violet)';e.currentTarget.style.color='var(--violet)';e.currentTarget.style.background='var(--violet-lt)'}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border2)';e.currentTarget.style.color='var(--text3)';e.currentTarget.style.background='transparent'}}
                      >
                        + Add another role
                      </button>
                      <div style={{ display:'flex', gap:10, marginTop:16, padding:'12px 14px', background:'rgba(108,71,255,.06)', border:'1px solid rgba(108,71,255,.18)', borderRadius:'var(--r)', fontSize:12, color:'var(--text2)', lineHeight:1.55 }}>
                        <span style={{ fontSize:16, flexShrink:0 }}>💡</span>
                        <span>You can configure full job descriptions, DNA requirements, and interview playbooks per role after going live. For now, just the basics.</span>
                      </div>
                    </div>
                    <div className="ob-card">
                      <div className="ob-card-title">Hiring goals</div>
                      <div className="ob-card-sub">Which functions are you expecting to grow?</div>
                      <div className="ob-tag-grid">
                        {['📦 Product','💻 Engineering','🎨 Design','📈 Marketing','💼 Sales','⚙️ Operations','💰 Finance','👥 HR / People'].map(t=>(
                          <div key={t} className="ob-tag" onClick={e=>e.currentTarget.classList.toggle('selected')}>{t}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5 — Trust Settings */}
                {step === 5 && (
                  <div className="ob-step active">
                    <div className="ob-step-header">
                      <div className="ob-step-eyebrow">Step 5 of 5 · Trust Settings</div>
                      <div className="ob-step-title">Set up your <span>review &amp; trust</span> settings.</div>
                      <div className="ob-step-desc">Configure how Hiro's bidirectional accountability system works for your company. All settings can be changed anytime.</div>
                    </div>
                    <div className="ob-card">
                      <div className="ob-card-title">Review &amp; trust settings</div>
                      <div className="ob-card-sub">Employers with reviews enabled see 31% higher candidate response rates.</div>
                      {[
                        { k:'receiveReviews',  icon:'✅', name:'Receive employee reviews',        desc:'Employees can leave anonymous verified reviews. Shown to matched candidates only — not public.' },
                        { k:'bidirectional',   icon:'↔️', name:'Enable bidirectional reviews',     desc:'Write verified, consensual reviews of former employees. Builds employer brand and contributes to candidate Reliability Scores.' },
                        { k:'disputeWindow',   icon:'🔒', name:'Dispute window before reviews go live', desc:'7-day window to raise factual disputes before an employee review publishes. Does not allow removal of legitimate negative reviews.' },
                        { k:'showSalary',      icon:'📊', name:'Show verified salary bands publicly', desc:'Increases inbound application quality by 62% on average. Salary data is verified by Hiro — cannot be inflated.' },
                        { k:'dnaMatching',     icon:'🧬', name:'Enable Work DNA™ matching',         desc:'Candidates matched to your team\'s DNA profile, not just their CV. GDPR-compliant pseudonymised matching.' },
                      ].map(t => (
                        <div
                          key={t.k}
                          className={`ob-toggle-row${trustSettings[t.k]?' active':''}`}
                          onClick={()=>toggleTrust(t.k)}
                          style={{ cursor:'pointer' }}
                        >
                          <span className="ob-toggle-icon">{t.icon}</span>
                          <div className="ob-toggle-body">
                            <div className="ob-toggle-name">{t.name}</div>
                            <div className="ob-toggle-desc">{t.desc}</div>
                          </div>
                          <div className={`ob-toggle-switch${trustSettings[t.k]?' on':''}`} />
                        </div>
                      ))}
                    </div>

                    {/* Fingerprint summary */}
                    <div className="ob-card">
                      <div className="ob-card-title">🖨️ Your company fingerprint is ready.</div>
                      <div className="ob-card-sub">Here's what Hiro's matching engine will use to surface and rank your ideal candidates.</div>
                      {[
                        { icon:'🏢', label:'Company identity', detail:`${industry||'Industry'} · ${companyStage||'Stage'} · ${companyLoc||'Location'} · ${companySize||'Headcount'}`, ok:!!companyName },
                        { icon:'🎨', label:'Culture fingerprint', detail:`${cultureTags.length} culture tags · ${workModel||'Work model'} · ${intensity||'Intensity'}`, ok:cultureTags.length>0 },
                        { icon:'🧬', label:'Team DNA™', detail:`7 dimensions configured · Archetype: ${currentArchetype.name}`, ok:true },
                        { icon:'📋', label:'Open roles', detail:`${roles.filter(r=>r.title).length} role${roles.filter(r=>r.title).length!==1?'s':''} configured with salary bands`, ok:roles.some(r=>r.title) },
                        { icon:'🔒', label:'Trust settings', detail:`${Object.values(trustSettings).filter(Boolean).length}/5 features enabled · DNA matching ${trustSettings.dnaMatching?'active':'off'}`, ok:true },
                      ].map((row,i) => (
                        <div key={i} className="ob-summary-row">
                          <span className="ob-summary-icon">{row.icon}</span>
                          <div className="ob-summary-text">
                            <strong>{row.label}</strong> · {row.detail}
                            <span className={`chip chip-${row.ok?'g':'amber'}`} style={{ marginLeft:8 }}>{row.ok?'✓ Complete':'⚠ Incomplete'}</span>
                          </div>
                        </div>
                      ))}

                      {/* Access preview */}
                      <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid var(--border)' }}>
                        <div style={{ fontSize:12, color:'var(--text3)', marginBottom:10 }}>Based on your profile, you have access to:</div>
                        {[
                          { icon:'👑', label:`${currentArchetype.name.replace('The ','')}s matching your culture`, count:'600+ candidates' },
                          { icon:'📊', label:'Candidates in your stage & salary range', count:'1,000+ candidates' },
                        ].map((a,i)=>(
                          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text2)' }}>
                              <span style={{ fontSize:16 }}>{a.icon}</span> {a.label}
                            </div>
                            <span style={{ padding:'3px 10px', borderRadius:999, fontSize:12, fontWeight:700, background:'rgba(13,148,136,.1)', border:'1px solid rgba(13,148,136,.25)', color:'#5eead4' }}>{a.count}</span>
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize:11, color:'var(--text3)', marginTop:14 }}>Clicking "Go live" makes your company discoverable to matched candidates instantly. Your Hiro Score™ will begin accumulating as reviews come in.</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer nav */}
          <div className="ob-footer-nav">
            <div className="ob-footer-eta">
              <div className="ob-eta-dot" />
              <span>{currentStepConfig?.eta} remaining</span>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              {step > 1 && (
                <button className="btn btn-back" onClick={()=>setStep(step-1)}>← Back</button>
              )}
              {step < steps.length ? (
                <button className="btn btn-violet" onClick={()=>advance(step+1)}>
                  Next · {steps[step]?.label} →
                </button>
              ) : (
                <button
                  className="btn btn-violet"
                  onClick={handleGoLive}
                  disabled={submitting}
                  style={mode==='employer'
                    ? { background:'linear-gradient(135deg,var(--violet),var(--violet2))', boxShadow:'0 4px 18px rgba(108,71,255,.3)' }
                    : { background:'linear-gradient(135deg,var(--violet),#f9a8d4)', boxShadow:'0 4px 18px rgba(108,71,255,.3)' }
                  }
                >
                  {submitting ? 'Going live…' : mode === 'employer' ? '✨ Go live now' : '🚀 Go live'}
                </button>
              )}
            </div>
          </div>
        </div>

        <RightPanel
          mode={mode} step={step} steps={steps}
          matchCount={baseMatchCount} liveCount={liveCount}
          firstName={firstName} lastName={lastName} title={title}
          location={location} salary={salary} skills={skills}
          companyName={companyName} industry={industry} companyStage={companyStage}
          dna={dna} roles={roles}
        />
      </div>
    </div>
  );
}
