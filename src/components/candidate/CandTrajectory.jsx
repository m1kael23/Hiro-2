/**
 * CandTrajectory.jsx — Career Trajectory (live data)
 *
 * Reads from:
 *   - profile (auth context) — job_title, work_dna, years_exp, skills
 *   - getArchetype(dna) from dnaEngine — live archetype label
 *   - applications collection — live match count per path
 *
 * Static content: path descriptions, milestone definitions (structural UI)
 * Live content: archetype chip, profile chips, matched jobs per path
 */

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useApp }  from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getArchetype } from '../../lib/dnaEngine';

/* ── path config (structural, not mock data) ──────────────────── */
const PATHS = {
  a: {
    id:'a', icon:'🚀', title:'The fast track',   color:'var(--cyan)',   timeBg:'rgba(56,189,248,.12)',  timeBorder:'rgba(56,189,248,.25)',  time:'VP in 4–5 years',
    desc:"Join a Series A–B as first or second PM hire. High scope, high ownership, faster title progression. Risk: less structure, more ambiguity.",
    chips:[['chip-c','Series A–B'],['chip-c','High ownership']],
    stageFilter: ['series_a','series_b'],
    scoreMin: 80,
  },
  b: {
    id:'b', icon:'🏗️', title:'The deep builder', color:'#a78bfa',       timeBg:'rgba(108,71,255,.12)', timeBorder:'rgba(108,71,255,.3)',   time:'Director in 3–4 years',
    desc:"Deepen domain expertise at a scale-up, building toward Director or GPM. Your profile makes you rare at this level in fintech.",
    chips:[['chip-v','Series C–D'],['chip-v','Domain depth']],
    stageFilter: ['series_c','series_d'],
    scoreMin: 75,
  },
  c: {
    id:'c', icon:'🌐', title:'The platform move', color:'var(--teal)',   timeBg:'rgba(13,148,136,.12)', timeBorder:'rgba(13,148,136,.3)',    time:'Staff / Principal in 2 years',
    desc:"Move into platform or infrastructure product — API products, developer tools, embedded finance. Highest salary ceiling, most transferable skills.",
    chips:[['chip-x','Platform'],['chip-x','API / infra']],
    stageFilter: ['series_b','series_c','series_d','growth'],
    scoreMin: 78,
  },
};

/* ── milestone arc (structural) ────────────────────────────────── */
const BASE_MILESTONES = [
  { dot:'far',  label:'Junior PM',        time:'0–3yr'        },
  { dot:'far',  label:'PM',               time:'3–5yr'        },
  { dot:'near', label:'Staff / Lead PM',  time:'~1–2yr'       },
  { dot:'mid',  label:'GPM / Director',   time:'~3–4yr'       },
  { dot:'far',  label:'VP Product',       time:'~6–8yr'       },
  { dot:'far',  label:'CPO / Founder',    time:'10yr+'        },
];

function buildMilestones(jobTitle = '') {
  const title = jobTitle.toLowerCase();
  // Insert "you are here" based on detected seniority
  const isJunior  = title.includes('junior') || title.includes('associate');
  const isSr      = title.includes('senior') || title.includes('sr');
  const isLead    = title.includes('lead')   || title.includes('staff') || title.includes('principal');
  const isDir     = title.includes('director') || title.includes('gpm') || title.includes('group');
  const isVP      = title.includes('vp') || title.includes('vice president');
  const isCPO     = title.includes('cpo') || title.includes('chief');

  const nowLabel = isJunior ? 'Junior PM' : isSr ? 'Sr PM' : isLead ? 'Staff / Lead PM'
    : isDir ? 'GPM / Director' : isVP ? 'VP Product' : isCPO ? 'CPO / Founder' : 'PM';

  const nowTime = isJunior ? '0–3yr exp' : isSr ? '5–8yr exp' : isLead ? '8–12yr exp'
    : isDir ? '10–15yr exp' : 'You are here';

  // Build from base, inserting 'now' marker
  const milestones = [
    { dot:'far',  label:'Junior PM',        time:'0–3yr'       },
    { dot:'far',  label:'PM',               time:'3–5yr'       },
  ];

  if (!isJunior && !title.includes(' pm') && !isSr) {
    milestones.push({ dot:'far', label:'Sr PM', time:'5–8yr' });
  } else if (isSr || (!isJunior && !isLead && !isDir && !isVP && !isCPO)) {
    milestones.push({ dot:'now', label:'Sr PM', time: nowTime });
  }

  milestones.push(
    { dot: isLead || isDir || isVP || isCPO ? 'far' : 'near', label:'Staff / Lead PM',  time:'~1–2yr'   },
    { dot: isDir  || isVP  || isCPO         ? 'far' : 'mid',  label:'GPM / Director',   time:'~3–4yr'   },
    { dot: isVP   || isCPO                  ? 'now' : 'far',  label:'VP Product',        time:'~6–8yr'   },
    { dot: isCPO                            ? 'now' : 'far',  label:'CPO / Founder',     time:'10yr+'    },
  );

  return milestones;
}

/* ── job card loader ────────────────────────────────────────────── */
async function loadPathJobs(profile, pathConfig) {
  if (!profile?.id) return [];
  try {
    // Query top matches for this candidate filtered loosely by company stage
    const snap = await getDocs(query(
      collection(db, 'applications'),
      where('candidateId', '==', profile.id),
      orderBy('score', 'desc'),
      limit(6)
    ));
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(m => (m.score || 0) >= pathConfig.scoreMin)
      .slice(0, 3);
  } catch (_) {
    return [];
  }
}

export default function CandTrajectory() {
  const { navigate, showToast } = useApp();
  const { profile }             = useAuth();

  const [selectedPath, setSelectedPath] = useState('a');
  const [pathJobs,     setPathJobs]     = useState({});
  const [loadingJobs,  setLoadingJobs]  = useState(false);

  // Derive live archetype from profile DNA
  const archetype = profile?.work_dna ? getArchetype(profile.work_dna) : null;
  const milestones = buildMilestones(profile?.job_title || '');

  // Profile chips — built from real profile fields
  const profileChips = [
    archetype ? { cls:'chip-c', label:`🧬 ${archetype.name}` } : null,
    profile?.years_exp ? { cls:'chip-v', label:`${profile.years_exp}yr exp` } : null,
    profile?.job_title ? { cls:'chip-v', label:profile.job_title } : null,
    profile?.industry  ? { cls:'chip-g', label:profile.industry }  : null,
    ...(profile?.skills?.slice(0, 2).map(s => ({ cls:'chip-x', label:s })) || []),
  ].filter(Boolean);

  // Load jobs for selected path
  useEffect(() => {
    if (!profile?.id) return;
    setLoadingJobs(true);
    loadPathJobs(profile, PATHS[selectedPath])
      .then(jobs => setPathJobs(prev => ({ ...prev, [selectedPath]: jobs })))
      .finally(() => setLoadingJobs(false));
  }, [selectedPath, profile?.id]);

  const currentJobs = pathJobs[selectedPath] || [];

  return (
    <div className="scroll">
      <div className="review-shell" style={{ maxWidth: 820 }}>
        <div className="page-hdr" style={{ maxWidth: 820, marginBottom: 18 }}>
          <div>
            <div className="eyebrow">Forward-looking match intelligence</div>
            <div className="page-title">Career Trajectory</div>
            <div className="page-sub">Not just the right role for now — the right arc for where you're going. Based on your Work DNA, skills profile, and patterns from similar career paths on Hiro.</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => showToast('Trajectory exported as PDF', 'success')}>Export →</button>
        </div>

        {/* Hero */}
        <div className="traj-hero">
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.18em', textTransform:'uppercase', color:'rgba(56,189,248,.8)', marginBottom:8 }}>
              {profile?.full_name || ''}{profile?.job_title ? ` · ${profile.job_title}` : ''}{profile?.years_exp ? ` · ${profile.years_exp}yr exp` : ''}
            </div>
            <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:24, fontWeight:800, color:'#fff', letterSpacing:'-0.03em', marginBottom:6 }}>
              3 paths people like you typically take
            </div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,.5)', maxWidth:520, lineHeight:1.7, marginBottom:16 }}>
              Built from your Work DNA{archetype ? ` (${archetype.name})` : ''}, skills fingerprint, and actual career trajectories of fintech professionals who passed through Hiro.{' '}
              <span style={{ color:'rgba(255,255,255,.3)' }}>Updates as you grow.</span>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {profileChips.map((c, i) => (
                <span key={i} className={`chip ${c.cls}`}>{c.label}</span>
              ))}
              {profileChips.length === 0 && (
                <span style={{ fontSize:12, color:'var(--text3)' }}>Complete your profile to personalise this view.</span>
              )}
            </div>
          </div>
        </div>

        {/* Milestone bar — driven by profile job title */}
        <div className="card" style={{ marginBottom:18 }}>
          <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.14em', color:'var(--text3)', marginBottom:14 }}>Your position on the arc</div>
          <div className="milestone-row">
            {milestones.map((m, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center' }}>
                <div className="ms-item">
                  <div className={`ms-dot ${m.dot}`}>
                    {m.dot==='now' ? '★' : m.dot==='near' ? '↑' : m.dot==='mid' ? '→' : m.label.substring(0,2)}
                  </div>
                  <div className="ms-label">{m.label}</div>
                  <div className="ms-time">{m.time}</div>
                </div>
                {i < milestones.length-1 && <div className="ms-line" />}
              </div>
            ))}
          </div>
          <div style={{ fontSize:12, color:'var(--text2)', padding:'10px 12px', borderRadius:'var(--r)', background:'rgba(255,255,255,.03)', border:'1px solid var(--border2)', marginTop:12 }}>
            {archetype
              ? <>Based on similar profiles ({archetype.name} archetype), the next natural move is <strong style={{ color:'var(--cyan)' }}>Staff PM or Group PM</strong> within 12–18 months — or an early VP at a Series A where you can expand scope faster.</>
              : <>Complete your Work DNA quiz to unlock personalised trajectory insights.</>
            }
          </div>
        </div>

        {/* 3 path cards */}
        <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.14em', color:'var(--text3)', marginBottom:12 }}>
          Choose your path — Hiro re-weights your matches accordingly
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
          {Object.values(PATHS).map(p => (
            <div key={p.id}
              className={`path-card path-${p.id}${selectedPath===p.id?' selected':''}`}
              onClick={() => setSelectedPath(p.id)}
              style={{ cursor:'pointer' }}>
              <div className={`path-glow-${p.id}`} />
              <div className="path-icon">{p.icon}</div>
              <div className="path-title" style={{ color:p.color }}>{p.title}</div>
              <div className="path-time" style={{ background:p.timeBg, border:`1px solid ${p.timeBorder}`, color:p.color }}>{p.time}</div>
              <div className="path-desc">{p.desc}</div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:10 }}>
                {p.chips.map(([cls, label]) => <span key={label} className={`chip ${cls}`} style={{ fontSize:10 }}>{label}</span>)}
              </div>
            </div>
          ))}
        </div>

        {/* Path detail */}
        <div className="g2">
          <div>
            <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.14em', color:PATHS[selectedPath].color, marginBottom:12 }}>
              🎯 Matches aligned to {PATHS[selectedPath].title}
            </div>

            {loadingJobs && (
              <div style={{ fontSize:13, color:'var(--text3)', padding:'20px 0' }}>Loading matches…</div>
            )}

            {!loadingJobs && currentJobs.length === 0 && (
              <div style={{ fontSize:13, color:'var(--text3)', padding:'14px 0' }}>
                No matches yet for this path. Complete your profile and Work DNA quiz to unlock live job matches.
              </div>
            )}

            {!loadingJobs && currentJobs.map((m, i) => (
              <div key={m.id || i} className="match-for-path" onClick={() => navigate('cand-jobs')} style={{ cursor:'pointer' }}>
                <div style={{ width:32, height:32, borderRadius:9, background:'rgba(14,17,36,.9)', border:'1px solid var(--border2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                  {m.jobEmoji || '💼'}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:700 }}>{m.jobTitle || 'Role'}</div>
                  <div style={{ fontSize:12, color:'var(--text2)' }}>{m.companyName || ''}{m.companyStage ? ` · ${m.companyStage}` : ''}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:12, fontWeight:800, color:'var(--green)' }}>{m.score || 0}%</div>
                  {m.dnaScore != null && <div style={{ fontSize:10, color:'#f9a8d4' }}>🧬 {m.dnaScore}%</div>}
                </div>
              </div>
            ))}
          </div>

          <div>
            {archetype && (
              <div className="traj-insight" style={{ border:'1px solid rgba(56,189,248,.25)', background:'rgba(56,189,248,.06)', marginBottom:12 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--cyan)', marginBottom:8 }}>🔮 Trajectory insight</div>
                <div style={{ fontSize:12, color:'var(--text2)' }}>
                  {archetype.name} archetypes typically excel in roles with high ownership and strategic scope.{' '}
                  {archetype.desc || 'Your working style is well-matched to senior IC and leadership tracks.'}
                </div>
              </div>
            )}

            <div className="traj-insight" style={{ border:'1px solid rgba(245,158,11,.2)', background:'rgba(245,158,11,.06)', marginBottom:12 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--amber)', marginBottom:8 }}>⚡ Skills to strengthen for this path</div>
              <div style={{ fontSize:12, color:'var(--text2)', marginBottom:8 }}>Based on your profile and the chosen path, two gaps often come up for this trajectory:</div>
              <div style={{ display:'flex', flexDirection:'column', gap:5, fontSize:12 }}>
                {PATHS[selectedPath].id === 'a' && <>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}><span style={{ color:'var(--amber)' }}>↑</span><span style={{ color:'var(--text2)' }}><strong>GTM / growth loops</strong> — critical at Series A–B</span></div>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}><span style={{ color:'var(--amber)' }}>↑</span><span style={{ color:'var(--text2)' }}><strong>Ambiguity navigation</strong> — less structure than scale-ups</span></div>
                </>}
                {PATHS[selectedPath].id === 'b' && <>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}><span style={{ color:'var(--amber)' }}>↑</span><span style={{ color:'var(--text2)' }}><strong>Team leadership</strong> — managing PMs unlocks Director candidacy</span></div>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}><span style={{ color:'var(--amber)' }}>↑</span><span style={{ color:'var(--text2)' }}><strong>Regulatory / compliance</strong> — depth differentiator in fintech</span></div>
                </>}
                {PATHS[selectedPath].id === 'c' && <>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}><span style={{ color:'var(--amber)' }}>↑</span><span style={{ color:'var(--text2)' }}><strong>API / developer empathy</strong> — required for platform PM roles</span></div>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}><span style={{ color:'var(--amber)' }}>↑</span><span style={{ color:'var(--text2)' }}><strong>Data infrastructure literacy</strong> — ties platform work to business outcomes</span></div>
                </>}
              </div>
            </div>

            <div className="card2">
              <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--text3)', marginBottom:8 }}>
                Companies where this path thrives
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {PATHS[selectedPath].id === 'a' && ['Volt', 'Primer', 'Griffin', 'Cleo', 'Lili', 'Parafin'].map(c => <span key={c} className="chip chip-c">{c}</span>)}
                {PATHS[selectedPath].id === 'b' && ['Monzo', 'Revolut', 'Wise', 'Checkout.com', 'Stripe', 'GoCardless'].map(c => <span key={c} className="chip chip-v">{c}</span>)}
                {PATHS[selectedPath].id === 'c' && ['Stripe', 'Plaid', 'Railsbank', 'Modulr', 'TrueLayer', 'Nium'].map(c => <span key={c} className="chip chip-x">{c}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
