import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getGeminiClient } from '../../services/geminiService';
import { Type } from '@google/genai';
import { getArchetype, dnaToProfile, DNA_DIMENSIONS, getDnaLabel } from '../../lib/dnaEngine';
import { scoreJobForCandidate } from '../../lib/matchStore';
import LocationAutocomplete from '../ui/LocationAutocomplete';

// Stable chip colour from skill name hash
const SKILL_CLASSES = ['chip-g', 'chip-v', 'chip-x'];
function getSkillClass(skillName) {
  if (!skillName) return 'chip-v';
  const hash = skillName.toLowerCase().split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return SKILL_CLASSES[hash % SKILL_CLASSES.length];
}

// Compute profile strength score from actual fields
function computeStrength(formData, workExp, userSkills, profile) {
  const checks = [
    { key: 'name',        done: !!(formData.first_name && formData.last_name),    pts: 10 },
    { key: 'title',       done: !!formData.job_title,                              pts: 10 },
    { key: 'experience',  done: !!formData.experience_years,                       pts: 5  },
    { key: 'location',    done: !!formData.location,                               pts: 5  },
    { key: 'avail',       done: true,                                              pts: 10 },
    { key: 'work_exp',    done: workExp.length > 0,                                pts: 20 },
    { key: 'skills',      done: userSkills.length >= 3,                            pts: 15 },
    { key: 'salary',      done: !!(formData.salary_min && formData.salary_max),    pts: 5  },
    { key: 'dna',         done: !!(profile?.dna && profile.dna.length === 7),      pts: 15 },
    { key: 'linkedin',    done: !!formData.linkedin,                               pts: 5  },
    { key: 'portfolio',   done: !!formData.portfolio,                              pts: 3  },
    { key: 'case_study',  done: !!formData.notion,                                 pts: 2  },
  ];
  const total = checks.reduce((s, c) => s + c.pts, 0);
  const earned = checks.filter(c => c.done).reduce((s, c) => s + c.pts, 0);
  return { pct: Math.round((earned / total) * 100), checks };
}

// DNA bar gradients per dimension
const DNA_GRADS = [
  'linear-gradient(180deg,#38bdf8,#6c47ff)',
  'linear-gradient(180deg,#a78bfa,#6c47ff)',
  'linear-gradient(180deg,#ec4899,#a78bfa)',
  'linear-gradient(180deg,#22c55e,#38bdf8)',
  'linear-gradient(180deg,#38bdf8,#22c55e)',
  'linear-gradient(180deg,#f59e0b,#ef4444)',
  'linear-gradient(180deg,#f59e0b,#ec4899)',
];

export default function CandProfile() {
  const { showToast, navigate, setSelectedEmployerId } = useApp();
  const { profile, updateProfile } = useAuth();
  const [avail, setAvail] = useState(profile?.availability || '🟢 Actively looking');

  const [formData, setFormData] = useState({
    first_name: '', last_name: '', job_title: '', experience_years: '',
    location: '', relocation: '', earliest_start: '', notice_period: '',
    looking_for: '', linkedin: '', portfolio: '', github: '', notion: '',
    salary_min: '', salary_max: '', currency: 'GBP', company_stage: '',
  });

  const [workExp, setWorkExp]     = useState([]);
  const [editingExp, setEditingExp] = useState(null);
  const [showExpModal, setShowExpModal] = useState(false);

  const [userSkills, setUserSkills]         = useState([]);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [recommendedSkills, setRecommendedSkills] = useState([]);
  const [loadingRecs, setLoadingRecs]       = useState(false);
  const [newSkillInput, setNewSkillInput]   = useState('');

  // Preview modal
  const [showPreview, setShowPreview]     = useState(false);
  const [previewStealth, setPreviewStealth] = useState(false);

  // Company typeahead
  const [companyQuery, setCompanyQuery]   = useState('');
  const [companySuggestions, setCompanySuggestions] = useState([]);
  const [companyLoading, setCompanyLoading] = useState(false);
  const companyTimerRef = useRef(null);

  useEffect(() => {
    if (profile) {
      let fName = profile.first_name || '';
      let lName = profile.last_name  || '';
      if (!fName && !lName && profile.full_name) {
        const parts = profile.full_name.trim().split(/\s+/);
        fName = parts[0] || '';
        lName = parts.slice(1).join(' ') || '';
      }
      // Salary: profile may have target_salary (onboarding) or salaryMin/salaryMax (range)
      // Normalise both into salary_min / salary_max for the editable range
      let salMin = profile.salary_min || profile.salaryMin || '';
      let salMax = profile.salary_max || profile.salaryMax || '';
      if (!salMin && !salMax && profile.target_salary) {
        // Single onboarding value → use as midpoint, ±15k as reasonable range
        const mid = parseInt(profile.target_salary, 10);
        salMin = Math.max(0, mid - 15);
        salMax = mid + 15;
      }

      setFormData({
        first_name: fName, last_name: lName,
        job_title: profile.job_title || '',
        experience_years: profile.experience_years || '',
        location: profile.location || '',
        relocation: profile.relocation || '',
        earliest_start: profile.earliest_start || '',
        notice_period: profile.notice_period || '',
        looking_for: profile.looking_for || '',
        linkedin: profile.linkedin || '',
        portfolio: profile.portfolio || '',
        github: profile.github || '',
        notion: profile.notion || '',
        salary_min: salMin,
        salary_max: salMax,
        currency: profile.currency || 'GBP',
        company_stage: profile.company_stage || '',
      });
      setWorkExp(profile.work_experience || []);
      setUserSkills(profile.skills || []);
      if (profile.availability) setAvail(profile.availability);
    }
  }, [profile]);

  // ── Company typeahead ────────────────────────────────────────────
  const searchCompanies = useCallback(async (q) => {
    if (!q || q.length < 2) { setCompanySuggestions([]); return; }
    setCompanyLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, 'users'),
          where('mode', '==', 'employer'),
          where('company_name', '>=', q),
          where('company_name', '<=', q + '\uf8ff'),
          limit(6)
        )
      );
      setCompanySuggestions(
        snap.docs.map(d => ({
          id: d.id,
          name: d.data().company_name || '',
          logo: d.data().logo_url || '',
          initial: (d.data().company_name || '?')[0].toUpperCase(),
        })).filter(c => c.name)
      );
    } catch {
      setCompanySuggestions([]);
    } finally {
      setCompanyLoading(false);
    }
  }, []);

  const handleCompanyInput = (val) => {
    setCompanyQuery(val);
    clearTimeout(companyTimerRef.current);
    companyTimerRef.current = setTimeout(() => searchCompanies(val), 300);
  };

  const selectCompany = (company) => {
    setEditingExp(prev => ({ ...prev, data: { ...prev.data, co: company.name, coLogoUrl: company.logo } }));
    setCompanyQuery('');
    setCompanySuggestions([]);
  };

  // ── Skills AI ───────────────────────────────────────────────────
  const fetchRecommendations = async () => {
    if (!formData.job_title) { showToast('Add a job title first', 'default'); return; }
    setLoadingRecs(true);
    try {
      const ai = getGeminiClient();
      if (!ai) { showToast('Gemini API key not configured', 'error'); return; }
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Suggest 10 relevant professional skills for a candidate with the job title: "${formData.job_title}". Return only a JSON array of strings.`,
        config: { responseMimeType: 'application/json', responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
      });
      const recs = JSON.parse(response.text);
      setRecommendedSkills(recs.filter(s => !userSkills.includes(s)));
    } catch { showToast('Could not fetch recommendations', 'error'); }
    finally { setLoadingRecs(false); }
  };

  // ── Save ────────────────────────────────────────────────────────
  const handleSave = async () => {
    const salMin = parseInt(String(formData.salary_min).replace(/[^0-9]/g, ''), 10) || null;
    const salMax = parseInt(String(formData.salary_max).replace(/[^0-9]/g, ''), 10) || null;
    const { error } = await updateProfile({
      ...formData,
      availability: avail,
      work_experience: workExp,
      skills: userSkills,
      full_name: `${formData.first_name} ${formData.last_name}`.trim(),
      // Write canonical range fields used by matching engine
      salary_min: salMin,
      salary_max: salMax,
      salaryMin: salMin,   // matchStore.js uses camelCase
      salaryMax: salMax,
      // Keep target_salary in sync as midpoint for legacy queries
      target_salary: salMin && salMax ? Math.round((salMin + salMax) / 2) : (salMin || salMax || null),
    });
    if (error) showToast('Error saving changes', 'error');
    else showToast('Changes saved', 'success');
  };

  // ── Preview — open employer-view modal ─────────────────────────
  const handlePreview = () => setShowPreview(true);

  // ── Skills ──────────────────────────────────────────────────────
  const handleAddSkill    = (s) => { if (s && !userSkills.includes(s)) { setUserSkills([...userSkills, s]); setRecommendedSkills(r => r.filter(x => x !== s)); setNewSkillInput(''); } };
  const handleRemoveSkill = (s) => setUserSkills(userSkills.filter(x => x !== s));

  // ── Work experience CRUD + reorder ──────────────────────────────
  const handleAddExp = () => {
    setCompanyQuery('');
    setCompanySuggestions([]);
    setEditingExp({ index: -1, data: { title: '', co: '', coLogoUrl: '', color: 'var(--violet)', period: '', desc: '' } });
    setShowExpModal(true);
  };

  const handleEditExp = (index) => {
    setCompanyQuery('');
    setCompanySuggestions([]);
    setEditingExp({ index, data: { ...workExp[index] } });
    setShowExpModal(true);
  };

  const handleSaveExp = () => {
    const updated = [...workExp];
    if (editingExp.index === -1) updated.unshift(editingExp.data);
    else updated[editingExp.index] = editingExp.data;
    setWorkExp(updated);
    setShowExpModal(false);
    setEditingExp(null);
  };

  const handleDeleteExp = (index) => {
    setWorkExp(workExp.filter((_, i) => i !== index));
    setShowExpModal(false);
    setEditingExp(null);
  };

  const moveExp = (index, dir) => {
    const updated = [...workExp];
    const swap = index + dir;
    if (swap < 0 || swap >= updated.length) return;
    [updated[index], updated[swap]] = [updated[swap], updated[index]];
    setWorkExp(updated);
  };

  // ── Derived ─────────────────────────────────────────────────────
  const getInitials = (name) => name ? name.split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';
  const currentFullName = `${formData.first_name} ${formData.last_name}`.trim() || profile?.full_name || 'Candidate';

  const strength = computeStrength(formData, workExp, userSkills, profile);

  // DNA — profile.dna is 0-100. Build 7 bars from dnaEngine dimensions.
  const dnaProfile = (profile?.dna && profile.dna.length === 7) ? dnaToProfile(profile.dna) : null;
  const dnaBars = dnaProfile
    ? DNA_DIMENSIONS.map((dim, i) => ({
        lbl: dim.label.split(' ')[0], // short label: "Energy", "Decision" etc
        h: `${profile.dna[i]}%`,      // already 0-100
        bg: DNA_GRADS[i],
      }))
    : [];
  const dnaTraits = dnaProfile?.archetype?.traits || [];
  const archetypeName = dnaProfile?.archetype?.name || profile?.archetype || null;

  // Strength items for right panel
  const strengthItems = [
    { label: 'Name complete',           done: strength.checks.find(c => c.key === 'name')?.done },
    { label: 'Job title added',         done: strength.checks.find(c => c.key === 'title')?.done },
    { label: 'Work experience added',   done: strength.checks.find(c => c.key === 'work_exp')?.done },
    { label: 'Skills added (3+)',       done: strength.checks.find(c => c.key === 'skills')?.done },
    { label: 'Salary range set',        done: strength.checks.find(c => c.key === 'salary')?.done },
    { label: 'Work DNA complete',       done: strength.checks.find(c => c.key === 'dna')?.done },
    { label: 'LinkedIn added (+5%)',    done: strength.checks.find(c => c.key === 'linkedin')?.done, bonus: true },
    { label: 'Portfolio link (+3%)',    done: strength.checks.find(c => c.key === 'portfolio')?.done, bonus: true },
    { label: 'Case study (+2%)',        done: strength.checks.find(c => c.key === 'case_study')?.done, bonus: true },
  ];

  return (
    <div className="view active" style={{ flexDirection: 'column' }}>
      <div className="scroll">
        {/* Header */}
        <div className="page-hdr" style={{ maxWidth: 980 }}>
          <div>
            <div className="eyebrow">{currentFullName} · {formData.job_title || 'Complete your profile'}</div>
            <div className="page-title">Your profile</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={handlePreview}>👁 Preview</button>
            <button className="btn btn-violet btn-sm" onClick={handleSave}>Save changes</button>
          </div>
        </div>

        <div className="profile-shell">
          {/* ── LEFT col ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Identity */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <div
                  style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--violet-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Manrope',sans-serif", fontSize: 20, fontWeight: 800, color: '#fff', flexShrink: 0, cursor: 'pointer' }}
                  onClick={() => showToast('Photo upload — connect Storage in Settings', 'default')}
                >{getInitials(currentFullName)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{currentFullName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{formData.job_title || 'Candidate'} · Open to roles</div>
                  <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 2 }}>● Active · last seen just now</div>
                </div>
                <span className={`chip ${strength.pct >= 80 ? 'chip-g' : strength.pct >= 50 ? 'chip-v' : 'chip-x'}`} style={{ fontSize: 12 }}>
                  Profile {strength.pct}%
                </span>
              </div>
              <div className="g2f">
                <div className="field"><label>First name</label><input className="inp" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} /></div>
                <div className="field"><label>Last name</label><input className="inp" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} /></div>
                <div className="field"><label>Current title</label><input className="inp" value={formData.job_title} onChange={e => setFormData({...formData, job_title: e.target.value})} /></div>
                <div className="field"><label>Years experience</label>
                  <select className="sel" value={formData.experience_years} onChange={e => setFormData({...formData, experience_years: e.target.value})}>
                    <option value="">Select...</option>
                    <option>0–2 years</option><option>2–4 years</option><option>4–6 years</option><option>6–10 years</option><option>10+ years</option>
                  </select>
                </div>
                <div className="field">
                  <label>Location</label>
                  <LocationAutocomplete value={formData.location} onChange={val => setFormData({...formData, location: val})} placeholder="e.g. London, UK" />
                </div>
                <div className="field"><label>Relocation</label>
                  <select className="sel" value={formData.relocation} onChange={e => setFormData({...formData, relocation: e.target.value})}>
                    <option value="">Select...</option>
                    <option>Not open</option><option>Open to EU cities</option><option>Open globally</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Availability */}
            <div className="card">
              <div className="card-title">Availability</div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
                {['🟢 Actively looking', '🟡 Open to conversations', '🔴 Not looking'].map(a => (
                  <div key={a} className={`availability-pill${avail === a ? ' active' : ''}`} onClick={() => setAvail(a)}>{a}</div>
                ))}
              </div>
              <div className="g2f">
                <div className="field"><label>Earliest start</label><input className="inp" type="date" value={formData.earliest_start} onChange={e => setFormData({...formData, earliest_start: e.target.value})} /></div>
                <div className="field"><label>Notice period</label>
                  <select className="sel" value={formData.notice_period} onChange={e => setFormData({...formData, notice_period: e.target.value})}>
                    <option value="">Select...</option>
                    <option>Immediate</option><option>1 month</option><option>2 months</option><option>3 months</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>What I&apos;m looking for</label>
                <textarea className="inp textarea" rows="3" value={formData.looking_for} onChange={e => setFormData({...formData, looking_for: e.target.value})} placeholder="Describe your ideal next role..." />
              </div>

              {/* Salary expectations */}
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border2)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 10 }}>Salary expectations</div>
                <div className="g2f" style={{ marginBottom: 10 }}>
                  <div className="field">
                    <label>Minimum (base)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      <span style={{ padding: '9px 10px', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border2)', borderRight: 'none', borderRadius: 'var(--rp) 0 0 var(--rp)', fontSize: 13, color: 'var(--text3)', flexShrink: 0 }}>
                        {formData.currency === 'EUR' ? '€' : formData.currency === 'USD' ? '$' : '£'}
                      </span>
                      <input
                        className="inp"
                        style={{ borderRadius: '0 var(--rp) var(--rp) 0', borderLeft: 'none' }}
                        type="number"
                        min="0"
                        max="2000"
                        value={formData.salary_min}
                        onChange={e => setFormData({...formData, salary_min: e.target.value})}
                        placeholder="e.g. 90"
                      />
                      <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--text3)', flexShrink: 0 }}>k</span>
                    </div>
                  </div>
                  <div className="field">
                    <label>Target / maximum</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      <span style={{ padding: '9px 10px', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border2)', borderRight: 'none', borderRadius: 'var(--rp) 0 0 var(--rp)', fontSize: 13, color: 'var(--text3)', flexShrink: 0 }}>
                        {formData.currency === 'EUR' ? '€' : formData.currency === 'USD' ? '$' : '£'}
                      </span>
                      <input
                        className="inp"
                        style={{ borderRadius: '0 var(--rp) var(--rp) 0', borderLeft: 'none' }}
                        type="number"
                        min="0"
                        max="2000"
                        value={formData.salary_max}
                        onChange={e => setFormData({...formData, salary_max: e.target.value})}
                        placeholder="e.g. 130"
                      />
                      <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--text3)', flexShrink: 0 }}>k</span>
                    </div>
                  </div>
                </div>
                <div className="field" style={{ maxWidth: '50%' }}>
                  <label>Currency</label>
                  <select className="sel" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                    <option value="GBP">GBP (£)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                {formData.salary_min && formData.salary_max && (
                  <div style={{ marginTop: 8, padding: '7px 12px', borderRadius: 'var(--r)', background: 'rgba(34,197,94,.07)', border: '1px solid rgba(34,197,94,.2)', fontSize: 12, color: 'var(--green)' }}>
                    💷 Expecting {formData.currency === 'EUR' ? '€' : formData.currency === 'USD' ? '$' : '£'}{formData.salary_min}k – {formData.currency === 'EUR' ? '€' : formData.currency === 'USD' ? '$' : '£'}{formData.salary_max}k · Employers outside this range won&apos;t see your profile for their roles
                  </div>
                )}
              </div>

              {/* Company stage preference */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 10 }}>Company preference</div>
                <div className="field">
                  <label>Preferred company stage</label>
                  <select className="sel" value={formData.company_stage} onChange={e => setFormData({...formData, company_stage: e.target.value})}>
                    <option value="">No preference</option>
                    <option value="Seed">Seed</option>
                    <option value="Series A">Series A</option>
                    <option value="Series A–C">Series A–C</option>
                    <option value="Series B–D">Series B–D</option>
                    <option value="Series D+">Series D+</option>
                    <option value="Scale-up">Scale-up</option>
                    <option value="Public / Enterprise">Public / Enterprise</option>
                    <option value="Any stage">Any stage</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Work experience */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div className="card-title" style={{ marginBottom: 0 }}>Work experience</div>
                <button className="btn btn-ghost btn-sm" onClick={handleAddExp}>+ Add</button>
              </div>
              {workExp.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>No work experience added yet.</div>
              ) : (
                workExp.map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14, padding: '10px 12px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.02)', border: '1px solid var(--border2)' }}>
                    {/* Company logo or coloured initial */}
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: e.coLogoUrl ? `url(${e.coLogoUrl}) center/cover` : (e.color || 'var(--violet)'), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: e.coLogoUrl ? 0 : 14, fontWeight: 800, color: '#fff' }}>
                      {!e.coLogoUrl && (e.co?.[0]?.toUpperCase() || '?')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{e.title || '—'}</div>
                          <div style={{ fontSize: 12, color: e.color || 'var(--violet)', fontWeight: 600, marginTop: 1 }}>{e.co}{e.period ? ` · ${e.period}` : ''}</div>
                        </div>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, flexShrink: 0, marginLeft: 8 }} onClick={() => handleEditExp(i)}>Edit</button>
                      </div>
                      {e.desc && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, lineHeight: 1.5 }}>{e.desc}</div>}
                    </div>
                    {/* Reorder buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                      <button onClick={() => moveExp(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', color: i === 0 ? 'var(--text3)' : 'var(--text2)', cursor: i === 0 ? 'default' : 'pointer', fontSize: 14, padding: '1px 4px', lineHeight: 1 }}>▲</button>
                      <button onClick={() => moveExp(i, 1)} disabled={i === workExp.length - 1} style={{ background: 'none', border: 'none', color: i === workExp.length - 1 ? 'var(--text3)' : 'var(--text2)', cursor: i === workExp.length - 1 ? 'default' : 'pointer', fontSize: 14, padding: '1px 4px', lineHeight: 1 }}>▼</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Skills */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div className="card-title" style={{ marginBottom: 0 }}>Skills</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowSkillsModal(true)}>Manage</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {userSkills.length === 0
                  ? <span style={{ fontSize: 12, color: 'var(--text3)' }}>No skills added yet.</span>
                  : userSkills.map(s => <span key={s} className={`chip ${getSkillClass(s)}`}>{s}</span>)
                }
              </div>
            </div>

            {/* Links */}
            <div className="card">
              <div className="card-title">Links & portfolio</div>
              <div className="g2f">
                <div className="field"><label>LinkedIn</label><input className="inp" value={formData.linkedin} onChange={e => setFormData({...formData, linkedin: e.target.value})} placeholder="linkedin.com/in/…" /></div>
                <div className="field"><label>Portfolio / website</label><input className="inp" value={formData.portfolio} onChange={e => setFormData({...formData, portfolio: e.target.value})} placeholder="yourwebsite.com" /></div>
                <div className="field"><label>GitHub</label><input className="inp" value={formData.github} onChange={e => setFormData({...formData, github: e.target.value})} placeholder="github.com/…" /></div>
                <div className="field"><label>Case study / Notion</label><input className="inp" value={formData.notion} onChange={e => setFormData({...formData, notion: e.target.value})} placeholder="notion.so/…" /></div>
              </div>
            </div>

            {/* Work DNA mini */}
            <div className="card" style={{ borderColor: 'rgba(236,72,153,.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div className="card-title" style={{ marginBottom: 0 }}>🧬 Work DNA</div>
                <button className="btn btn-dna btn-sm" onClick={() => navigate('cand-work-dna')}>Edit full DNA →</button>
              </div>
              {dnaBars.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text3)', padding: '12px 0' }}>
                  Complete your DNA profile to see your dimensions.{' '}
                  <button style={{ background: 'none', border: 'none', color: 'var(--violet)', cursor: 'pointer', fontSize: 12, padding: 0 }} onClick={() => navigate('cand-work-dna')}>Go to Work DNA →</button>
                </div>
              ) : (
                <>
                  {/* 7-bar chart */}
                  <div style={{ display: 'flex', gap: 6, height: 60, alignItems: 'flex-end', marginBottom: 10 }}>
                    {dnaBars.map(b => (
                      <div key={b.lbl} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <div style={{ width: '100%', height: 50, background: 'rgba(255,255,255,.06)', borderRadius: 4, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                          <div style={{ width: '100%', height: b.h, background: b.bg, borderRadius: 4, transition: 'height .4s ease' }} />
                        </div>
                        <div style={{ fontSize: 8, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'center' }}>{b.lbl}</div>
                      </div>
                    ))}
                  </div>
                  {/* Archetype + traits from dnaEngine */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {archetypeName && <span className="dna-trait">{archetypeName}</span>}
                    {dnaTraits.slice(0, 3).map(t => <span key={t} className="dna-trait">{t}</span>)}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── RIGHT col ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Profile strength — live */}
            <div style={{ background: 'var(--violet-grad)', borderRadius: 'var(--rl)', padding: 20, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.07)' }} />
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', opacity: .65, marginBottom: 4, color: '#fff' }}>Profile strength</div>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 44, fontWeight: 800, lineHeight: 1, color: '#fff' }}>{strength.pct}%</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', marginBottom: 14 }}>
                {strength.pct >= 90 ? 'Near-perfect fingerprint' : strength.pct >= 70 ? 'Strong profile' : strength.pct >= 50 ? 'Getting there' : 'Just getting started'}
              </div>
              <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 'var(--rp)', height: 6, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ width: `${strength.pct}%`, height: '100%', background: 'rgba(255,255,255,.85)', borderRadius: 'inherit', transition: 'width .5s ease' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {strengthItems.map(item => (
                  <div key={item.label} className="strength-item" style={{ color: item.done ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.4)' }}>
                    {item.done ? '✓' : '○'} {item.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Visibility */}
            <div className="card">
              <div className="card-title">Visibility</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 'var(--r)', background: 'rgba(34,197,94,.07)', border: '1px solid rgba(34,197,94,.25)' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>🟢 Visible to employers</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>Matched employers only</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('cand-stealth')}>Manage →</button>
                </div>
                <div style={{ padding: '9px 12px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border2)', fontSize: 12, color: 'var(--text2)' }}>
                  🛡️ Your current employer <strong>cannot</strong> see your profile.{' '}
                  <button style={{ background: 'none', border: 'none', color: 'var(--violet)', cursor: 'pointer', fontSize: 12, padding: 0 }} onClick={() => navigate('cand-stealth')}>Stealth settings →</button>
                </div>
              </div>
            </div>

            {/* How employers see you */}
            <div className="card">
              <div className="card-title">How employers see you</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>Top attributes employers see first:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {archetypeName && (
                  <div style={{ padding: '9px 12px', borderRadius: 'var(--r)', background: 'rgba(236,72,153,.07)', border: '1px solid rgba(236,72,153,.2)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>🧬</span>
                    <div><strong style={{ color: '#f9a8d4' }}>{archetypeName}</strong>{dnaTraits.length > 0 && ` — ${dnaTraits.slice(0,2).join(', ')}`}</div>
                  </div>
                )}
                {userSkills.length > 0 && (
                  <div style={{ padding: '9px 12px', borderRadius: 'var(--r)', background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.2)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>💼</span><div><strong style={{ color: 'var(--green)' }}>{userSkills.slice(0, 3).join(' · ')}</strong></div>
                  </div>
                )}
                {(formData.relocation || formData.notice_period) && (
                  <div style={{ padding: '9px 12px', borderRadius: 'var(--r)', background: 'rgba(56,189,248,.06)', border: '1px solid rgba(56,189,248,.2)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>🚀</span>
                    <div><strong style={{ color: 'var(--cyan)' }}>{[formData.relocation, formData.notice_period && `${formData.notice_period} notice`].filter(Boolean).join(' · ')}</strong></div>
                  </div>
                )}
                {!archetypeName && userSkills.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Complete your profile to see how employers view you.</div>
                )}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
                onClick={handlePreview}
              >
                👁 Full employer preview →
              </button>
            </div>

            {/* Stats */}
            <div className="card">
              <div className="card-title">Your stats this month</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[['Profile views','0','#a78bfa'],['Employers shortlisted you','0','var(--cyan)'],['DNA match requests','0','#ec4899'],['Mutual matches','0','var(--green)']].map(([lbl,val,col]) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <span style={{ color: 'var(--text2)' }}>{lbl}</span>
                    <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, color: col }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Candidate Preview Modal — how employers see you ── */}
      {showPreview && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#0d1020', borderRadius: 'var(--rl)', border: '1px solid rgba(255,255,255,.1)', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.7)' }}>
            {/* Preview header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Employer preview</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>This is exactly what employers see when they open your profile</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Stealth toggle */}
                <button
                  onClick={() => setPreviewStealth(s => !s)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 'var(--rp)', border: `1px solid ${previewStealth ? 'rgba(20,184,166,.4)' : 'var(--border2)'}`, background: previewStealth ? 'rgba(20,184,166,.1)' : 'rgba(255,255,255,.04)', cursor: 'pointer', fontSize: 11, color: previewStealth ? 'var(--teal)' : 'var(--text2)', transition: 'all .2s' }}
                >
                  {previewStealth ? '🔒 Stealth on' : '👁 Stealth off'}
                </button>
                <button onClick={() => setShowPreview(false)} style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 8, width: 30, height: 30, color: 'var(--text2)', cursor: 'pointer', fontSize: 14 }}>✕</button>
              </div>
            </div>

            {/* Candidate card — employer view */}
            <div className="scroll" style={{ flex: 1, padding: 20 }}>
              {/* Identity row */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: previewStealth ? 'rgba(20,184,166,.2)' : 'var(--violet-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                  {previewStealth ? '🔒' : (currentFullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2))}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                    {previewStealth ? 'Anonymous Candidate' : currentFullName}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                    {formData.job_title || 'Candidate'} · {formData.location || 'Location not set'} · {formData.experience_years || '—'}
                  </div>
                  {previewStealth && (
                    <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6, background: 'rgba(20,184,166,.12)', border: '1px solid rgba(20,184,166,.3)', fontSize: 11, color: 'var(--teal)' }}>
                      🔒 Stealth active — name and contact hidden until mutual reveal
                    </div>
                  )}
                </div>
                {dnaProfile?.archetype && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--violet)' }}>{dnaProfile.archetype.emoji}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{dnaProfile.archetype.name}</div>
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  ['Salary', formData.salary_min && formData.salary_max
                    ? `${formData.currency === 'EUR' ? '€' : formData.currency === 'USD' ? '$' : '£'}${formData.salary_min}–${formData.salary_max}k`
                    : '—'],
                  ['Notice', formData.notice_period || '—'],
                  ['Stage', formData.company_stage || 'Any'],
                  ['Avail', avail.replace(/^[^\s]+\s/, '')],
                ].map(([lbl, val]) => (
                  <div key={lbl} style={{ padding: '9px 10px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border2)', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>{lbl}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, wordBreak: 'break-word' }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Skills */}
              {userSkills.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 8 }}>Skills</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {userSkills.map(s => <span key={s} className={`chip ${getSkillClass(s)}`} style={{ fontSize: 11 }}>{s}</span>)}
                  </div>
                </div>
              )}

              {/* Work DNA */}
              {dnaProfile && (
                <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 'var(--r)', background: 'rgba(236,72,153,.05)', border: '1px solid rgba(236,72,153,.2)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#f9a8d4', marginBottom: 10 }}>Work DNA™</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {DNA_DIMENSIONS.map((dim, i) => {
                      const val = profile?.dna?.[i] ?? 50;
                      return (
                        <div key={dim.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, width: 16 }}>{dim.icon}</span>
                          <span style={{ fontSize: 11, color: 'var(--text2)', width: 110, flexShrink: 0 }}>{dim.label}</span>
                          <div style={{ flex: 1, height: 5, borderRadius: 999, background: 'rgba(255,255,255,.08)', position: 'relative' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${val}%`, borderRadius: 999, background: 'var(--violet)', opacity: .8 }} />
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text3)', width: 90, textAlign: 'right', flexShrink: 0 }}>{getDnaLabel(i, val)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
                    {dnaProfile.archetype?.traits?.map(t => <span key={t} className="dna-trait">{t}</span>)}
                  </div>
                </div>
              )}

              {/* Work experience */}
              {workExp.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 10 }}>Experience</div>
                  {workExp.map((e, i) => (
                    <div key={i} style={{ padding: '12px 14px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{previewStealth ? e.title : e.title}</div>
                          <div style={{ fontSize: 12, color: e.color || 'var(--violet)', fontWeight: 600 }}>{e.co}</div>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0, marginLeft: 12 }}>{e.period}</span>
                      </div>
                      {e.desc && <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{e.desc}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* Links — hidden in stealth */}
              {!previewStealth && (formData.linkedin || formData.portfolio || formData.github) && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 8 }}>Links</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 2 }}>
                    {formData.linkedin && <div>💼 {formData.linkedin}</div>}
                    {formData.portfolio && <div>🌐 {formData.portfolio}</div>}
                    {formData.github && <div>⌨️ {formData.github}</div>}
                  </div>
                </div>
              )}
              {previewStealth && (
                <div style={{ padding: '10px 14px', borderRadius: 'var(--r)', background: 'rgba(20,184,166,.06)', border: '1px solid rgba(20,184,166,.25)', fontSize: 12, color: 'var(--teal)' }}>
                  🔒 Contact details, full name, and LinkedIn are hidden until you mutually reveal.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Experience Modal ── */}
      {showExpModal && editingExp && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: 500, margin: 20 }}>
            <div className="card-title">{editingExp.index === -1 ? 'Add experience' : 'Edit experience'}</div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Job title</label>
              <input className="inp" value={editingExp.data.title} onChange={e => setEditingExp({...editingExp, data: {...editingExp.data, title: e.target.value}})} placeholder="e.g. Senior Product Manager" />
            </div>
            {/* Company with typeahead */}
            <div className="field" style={{ marginBottom: 12, position: 'relative' }}>
              <label>Company</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {editingExp.data.coLogoUrl && (
                  <img src={editingExp.data.coLogoUrl} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                )}
                {!editingExp.data.coLogoUrl && editingExp.data.co && (
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: editingExp.data.color || 'var(--violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{editingExp.data.co[0]?.toUpperCase()}</div>
                )}
                <input
                  className="inp"
                  value={companyQuery || editingExp.data.co}
                  onChange={e => { handleCompanyInput(e.target.value); setEditingExp({...editingExp, data: {...editingExp.data, co: e.target.value, coLogoUrl: ''}}); }}
                  placeholder="e.g. Monzo — search Hiro companies"
                />
              </div>
              {/* Suggestions dropdown */}
              {companySuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginTop: 4, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,.4)' }}>
                  {companyLoading && <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text3)' }}>Searching…</div>}
                  {companySuggestions.map(c => (
                    <div key={c.id} onClick={() => selectCompany(c)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border2)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,71,255,.1)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {c.logo
                        ? <img src={c.logo} alt="" style={{ width: 24, height: 24, borderRadius: 5, objectFit: 'cover' }} />
                        : <div style={{ width: 24, height: 24, borderRadius: 5, background: 'var(--violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff' }}>{c.initial}</div>
                      }
                      <span style={{ fontSize: 13 }}>{c.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--violet)', marginLeft: 'auto' }}>On Hiro ✓</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="g2f">
              <div className="field"><label>Period</label><input className="inp" value={editingExp.data.period} onChange={e => setEditingExp({...editingExp, data: {...editingExp.data, period: e.target.value}})} placeholder="Jan 2020 – Mar 2022" /></div>
              <div className="field">
                <label>Colour</label>
                <select className="sel" value={editingExp.data.color} onChange={e => setEditingExp({...editingExp, data: {...editingExp.data, color: e.target.value}})}>
                  <option value="var(--violet)">Violet</option>
                  <option value="var(--cyan)">Cyan</option>
                  <option value="var(--teal)">Teal</option>
                  <option value="var(--green)">Green</option>
                  <option value="var(--orange)">Orange</option>
                </select>
              </div>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Description</label>
              <textarea className="inp textarea" rows="4" value={editingExp.data.desc} onChange={e => setEditingExp({...editingExp, data: {...editingExp.data, desc: e.target.value}})} placeholder="Key achievements and responsibilities…" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <div>
                {editingExp.index !== -1 && (
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDeleteExp(editingExp.index)}>Delete</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setShowExpModal(false); setCompanySuggestions([]); }}>Cancel</button>
                <button className="btn btn-violet btn-sm" onClick={handleSaveExp}>Apply</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Skills Modal ── */}
      {showSkillsModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: 550, margin: 20, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="card-title">Manage skills</div>
            <div className="scroll" style={{ flex: 1, paddingRight: 4 }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 8 }}>Your skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {userSkills.length === 0 && <div style={{ fontSize: 13, color: 'var(--text3)' }}>No skills added.</div>}
                  {userSkills.map(s => (
                    <span key={s} className={`chip ${getSkillClass(s)}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {s}
                      <button onClick={() => handleRemoveSkill(s)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, opacity: 0.6 }}>×</button>
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 8 }}>Add skill</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="inp" placeholder="Type a skill…" value={newSkillInput} onChange={e => setNewSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSkill(newSkillInput)} />
                  <button className="btn btn-violet btn-sm" onClick={() => handleAddSkill(newSkillInput)}>Add</button>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)' }}>AI recommendations</div>
                  <button className="btn btn-ghost btn-sm" onClick={fetchRecommendations} disabled={loadingRecs} style={{ fontSize: 10 }}>{loadingRecs ? 'Generating…' : '✨ Refresh'}</button>
                </div>
                {loadingRecs
                  ? <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Analysing your profile…</div>
                  : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {recommendedSkills.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>{formData.job_title ? 'Click refresh for AI skill suggestions.' : 'Add a job title to get recommendations.'}</div>}
                      {recommendedSkills.map(s => (
                        <button key={s} className="chip chip-v" style={{ cursor: 'pointer', border: '1px dashed var(--violet)', background: 'none' }} onClick={() => handleAddSkill(s)}>+ {s}</button>
                      ))}
                    </div>
                  )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-violet btn-sm" onClick={() => setShowSkillsModal(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
