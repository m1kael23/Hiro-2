import { useState, useMemo, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { logGhostEvent, ghostTypeForMove } from '../../lib/ghostEvents';
import { db } from '../../firebase';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { analyzeTrajectory } from '../../services/geminiService';
import {
  scoreCandidateForJob,
  getScoreColour,
  getScoreLabel,
} from '../../lib/matchStore';

const STAGES = ['Matched', 'Screening', 'Round 1', 'Round 2', 'Pre-offer', 'Offer'];

function Pill({ val, label, color }) {
  return (
    <span style={{ padding:'2px 8px', borderRadius:'var(--rp)', background:`${color}18`, border:`1px solid ${color}35`, fontSize:10, fontWeight:700, color }}>
      {label} {val}%
    </span>
  );
}

function DnaBar({ dim, candVal, teamVal, fit }) {
  const col = getScoreColour(fit);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
      <span style={{ fontSize:13, width:18, flexShrink:0 }}>{dim.icon}</span>
      <span style={{ fontSize:11, color:'var(--text2)', width:106, flexShrink:0 }}>{dim.label}</span>
      <div style={{ flex:1, position:'relative', height:5, borderRadius:999, background:'rgba(255,255,255,.08)' }}>
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${candVal}%`, borderRadius:999, background:col, opacity:.75 }} />
        <div style={{ position:'absolute', top:'50%', left:`${teamVal}%`, transform:'translate(-50%,-50%)', width:9, height:9, borderRadius:'50%', background:'rgba(255,255,255,.9)', border:'1.5px solid rgba(0,0,0,.5)', boxShadow:'0 0 4px rgba(255,255,255,.5)' }} />
      </div>
      <span style={{ fontSize:11, fontWeight:700, color:col, width:26, textAlign:'right', flexShrink:0 }}>{fit}%</span>
    </div>
  );
}

function CandRow({ cand, isSelected, onClick }) {
  const sc  = cand.scores;
  const col = getScoreColour(sc.overall);
  return (
    <div
      onClick={onClick}
      style={{
        display:'flex', alignItems:'center', gap:10,
        padding:'10px 12px', borderRadius:'var(--r)', marginBottom:5, cursor:'pointer',
        border:`1px solid ${isSelected ? 'rgba(108,71,255,.5)' : 'var(--border)'}`,
        background: isSelected ? 'rgba(108,71,255,.08)' : 'rgba(255,255,255,.02)',
        transition:'all .15s',
      }}
    >
      <div style={{ width:36, height:36, borderRadius:10, background:cand.grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#fff', flexShrink:0 }}>
        {cand.initials}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{cand.name}</div>
        <div style={{ fontSize:11, color:'var(--text2)', marginTop:1 }}>{cand.role} · {cand.location}</div>
        <div style={{ display:'flex', gap:5, marginTop:6, flexWrap:'wrap' }}>
          <Pill val={sc.dna}    label="🧬" color="#ec4899" />
          <Pill val={sc.skills} label="Skills" color="#38bdf8" />
          {cand.candidateExpressedInterest && <span style={{ padding:'2px 7px', borderRadius:'var(--rp)', background:'rgba(251,113,133,.1)', border:'1px solid rgba(251,113,133,.25)', fontSize:10, fontWeight:700, color:'var(--red)' }}>❤️ Expressed Interest</span>}
          {cand.employerExpressedInterest && cand.candidateExpressedInterest && <span style={{ padding:'2px 7px', borderRadius:'var(--rp)', background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.2)', fontSize:10, fontWeight:700, color:'var(--green)' }}>🤝 Mutual Match</span>}
          {cand.status === 'applied' && <span style={{ padding:'2px 7px', borderRadius:'var(--rp)', background:'rgba(108,71,255,.1)', border:'1px solid rgba(108,71,255,.25)', fontSize:10, fontWeight:700, color:'#a78bfa' }}>⚡ Applied</span>}
          {cand.reloc && <span style={{ padding:'2px 7px', borderRadius:'var(--rp)', background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.25)', fontSize:10, color:'var(--amber)' }}>📦 Reloc</span>}
        </div>
      </div>
      <div style={{ fontFamily:'Manrope,sans-serif', fontSize:20, fontWeight:800, color:col, flexShrink:0 }}>{sc.overall}%</div>
    </div>
  );
}

function CandDetail({ cand, job, onStageChange, onMessage, onMatchBack }) {
  const { showToast } = useApp();
  const sc  = cand.scores;
  const col = getScoreColour(sc.overall);

  const [stage, setStage] = useState(cand.currentStage || 'Matched');
  const [tab,   setTab]   = useState('overview');
  const [confirmStage, setConfirmStage] = useState(null);
  const [aiTrajectory, setAiTrajectory] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    if (cand.workExp && cand.workExp.length > 0) {
      setLoadingAi(true);
      analyzeTrajectory(cand.workExp).then(res => {
        setAiTrajectory(res);
        setLoadingAi(false);
      });
    } else {
      setAiTrajectory(null);
    }
  }, [cand.id, cand.workExp]);

  function handleStage(s) {
    if (s === stage) return;
    setConfirmStage(s);
  }

  function confirmStageChange() {
    setStage(confirmStage);
    onStageChange?.(cand.id, confirmStage);
    showToast(`${cand.name} moved to ${confirmStage}`, 'success');
    setConfirmStage(null);
  }

  const isMatched        = cand.employerExpressedInterest;
  const expressedInterest = cand.candidateExpressedInterest;

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'20px 22px 40px', minWidth:0, position:'relative' }}>

      {confirmStage && (
        <div style={{ position:'absolute', inset:0, background:'rgba(10,10,15,.9)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:24, maxWidth:320, width:'100%', boxShadow:'0 20px 40px rgba(0,0,0,.4)' }}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:12, color:'#fff' }}>Change Pipeline Stage?</div>
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.5, marginBottom:20 }}>
              Move <strong>{cand.name}</strong> from <strong>{stage}</strong> to <strong>{confirmStage}</strong>?
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setConfirmStage(null)} style={{ flex:1, padding:'10px', borderRadius:'var(--rp)', background:'rgba(255,255,255,.05)', border:'1px solid var(--border)', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancel</button>
              <button onClick={confirmStageChange}          style={{ flex:1, padding:'10px', borderRadius:'var(--rp)', background:'var(--violet)', border:'none', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:20 }}>
        <div style={{ width:56, height:56, borderRadius:14, background:cand.grad || 'var(--violet)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:800, color:'#fff', flexShrink:0 }}>
          {cand.initials || cand.name?.charAt(0)}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:20, fontWeight:700, marginBottom:2 }}>{cand.name}</div>
          <div style={{ fontSize:13, color:'var(--text2)' }}>{cand.role} · {cand.exp} exp · {cand.location}</div>
          <div style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>
            {cand.salary} · {cand.notice} notice
            {cand.reloc && ' · 📦 Open to relocation'}
          </div>
          <div style={{ marginTop:8, display:'inline-flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:'var(--rp)', background:'rgba(236,72,153,.1)', border:'1px solid rgba(236,72,153,.25)' }}>
            <span style={{ fontSize:12 }}>{sc.archetype?.emoji}</span>
            <span style={{ fontSize:12, fontWeight:700, color:'#f9a8d4' }}>{sc.archetype?.name}</span>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
          {!isMatched ? (
            <button className="btn btn-violet btn-sm" onClick={() => onMatchBack(cand)}>
              {expressedInterest ? '✨ Match Back' : '❤️ Express Interest'}
            </button>
          ) : (
            <div style={{ padding:'6px 12px', borderRadius:'var(--rp)', background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.2)', color:'var(--green)', fontSize:12, fontWeight:700, textAlign:'center' }}>
              🤝 Mutual Match
            </div>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => onMessage(cand)}>💬 Message</button>
          <button className="btn btn-ghost btn-sm" onClick={() => showToast('Offer letter opened', 'success')}>Make offer</button>
        </div>
      </div>

      {/* Stage selector */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text3)', marginBottom:8 }}>Pipeline stage</div>
        <div style={{ display:'flex', gap:0, borderRadius:'var(--r)', overflow:'hidden', border:'1px solid var(--border)' }}>
          {STAGES.map((s,i) => (
            <button key={s} onClick={() => handleStage(s)} style={{
              flex:1, padding:'7px 4px', border:'none', cursor:'pointer',
              background: stage===s ? 'var(--violet)' : 'rgba(255,255,255,.02)',
              color: stage===s ? '#fff' : 'var(--text3)',
              fontSize:10, fontWeight:700,
              borderRight: i < STAGES.length-1 ? '1px solid var(--border)' : 'none',
              transition:'background .15s, color .15s',
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Score strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:20 }}>
        {[
          { label:'Hiro Fit',    val:sc.overall,      sub:getScoreLabel(sc.overall), col },
          { label:'🧬 DNA',     val:sc.dna,          sub:'Culture fit',             col:'#f9a8d4' },
          { label:'Skills',     val:sc.skills,       sub:'Skills match',            col:'var(--cyan)' },
          { label:'Reliability',val:cand.reliability, sub:`${cand.vaultCount} vault reports`, col:'var(--amber)' },
        ].map(r => (
          <div key={r.label} style={{ padding:'10px 8px', borderRadius:'var(--r)', background:'rgba(255,255,255,.03)', border:'1px solid var(--border)', textAlign:'center' }}>
            <div style={{ fontSize:10, color:'var(--text3)', marginBottom:3 }}>{r.label}</div>
            <div style={{ fontFamily:'Manrope,sans-serif', fontSize:20, fontWeight:800, color:r.col, lineHeight:1 }}>{r.val}{r.label==='Reliability'?'':' %'}</div>
            <div style={{ fontSize:9, color:'var(--text3)', marginTop:3 }}>{r.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, marginBottom:16, borderBottom:'1px solid var(--border)' }}>
        {[['overview','Overview'],['dna','🧬 DNA breakdown'],['experience','Experience']].map(([id,lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:'7px 14px', border:'none', background:'none', cursor:'pointer',
            fontFamily:'Inter', fontSize:12, fontWeight:600,
            color: tab===id ? 'var(--text)' : 'var(--text3)',
            borderBottom: tab===id ? '2px solid var(--violet)' : '2px solid transparent',
            marginBottom:-1, transition:'color .15s',
          }}>{lbl}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          <div style={{ padding:'12px 14px', borderRadius:'var(--r)', background:'rgba(236,72,153,.05)', border:'1px solid rgba(236,72,153,.2)', marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#f9a8d4', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:6 }}>🧬 DNA fit insight</div>
            <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.65, margin:0 }}>{sc.dnaNote}</p>
          </div>
          {sc.dnaWarn && (
            <div style={{ display:'flex', gap:8, padding:'10px 12px', borderRadius:'var(--r)', background:'rgba(245,158,11,.07)', border:'1px solid rgba(245,158,11,.25)', fontSize:12, color:'var(--amber)', marginBottom:14 }}>
              <span>⚠</span><span>{sc.dnaWarn}</span>
            </div>
          )}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text3)', marginBottom:8 }}>Skills match</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {job.skillsRequired?.map(skill => {
                const has = cand.skills?.map(s => s.toLowerCase()).includes(skill.toLowerCase());
                return (
                  <span key={skill} style={{ padding:'4px 10px', borderRadius:'var(--rp)', fontSize:12, fontWeight:600, background: has ? 'rgba(34,197,94,.1)' : 'rgba(251,113,133,.08)', border:`1px solid ${has ? 'rgba(34,197,94,.28)' : 'rgba(251,113,133,.2)'}`, color: has ? 'var(--green)' : 'var(--red)' }}>
                    {has ? '✓' : '–'} {skill}
                  </span>
                );
              })}
            </div>
          </div>
          <div style={{ padding:'10px 13px', borderRadius:'var(--r)', background:'rgba(56,189,248,.05)', border:'1px solid rgba(56,189,248,.2)', fontSize:12, color:'var(--cyan)', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
              <span style={{ fontSize:14 }}>🗺️</span>
              <strong style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.05em' }}>AI Trajectory Analysis</strong>
              {loadingAi && <span className="animate-pulse" style={{ fontSize:10, opacity:0.6 }}>(Analyzing...)</span>}
            </div>
            <div style={{ lineHeight:1.5, fontWeight:500 }}>
              {loadingAi ? 'Hiro is analyzing career progression...' : (aiTrajectory || cand.trajectory || 'No trajectory data available.')}
            </div>
          </div>
        </div>
      )}

      {tab === 'dna' && (
        <div>
          <div className="dna-archetype" style={{ marginBottom:14 }}>
            <strong>{sc.archetype?.name}</strong> — {sc.archetype?.desc}
          </div>
          <div style={{ padding:'12px 14px', borderRadius:'var(--r)', background:'rgba(255,255,255,.02)', border:'1px solid var(--border)', marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text3)', marginBottom:10 }}>
              7 dimensions · Bar = candidate · ⚪ dot = role target
            </div>
            {sc.breakdown?.map(b => (
              <DnaBar key={b.dim} dim={{ icon: b.icon, label: b.dim }} candVal={b.candVal} teamVal={b.jobVal} fit={b.fit} />
            ))}
          </div>
          <div style={{ fontSize:10, color:'var(--text3)', marginTop:-10, marginBottom:14, textAlign:'center' }}>
            Bar = candidate position · ⚪ dot = role target · score = dimension alignment
          </div>
          <div style={{ padding:'14px', borderRadius:'var(--r)', background:`${sc.archetype?.color}10`, border:`1px solid ${sc.archetype?.color}30` }}>
            <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8 }}>
              <span style={{ fontSize:22 }}>{sc.archetype?.emoji}</span>
              <div>
                <div style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.1em' }}>Archetype</div>
                <div style={{ fontSize:15, fontWeight:700, color:sc.archetype?.color }}>{sc.archetype?.name}</div>
              </div>
            </div>
            <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.65, margin:'0 0 10px' }}>{sc.archetype?.desc}</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
              {sc.archetype?.traits?.map(t => (
                <span key={t} style={{ padding:'2px 8px', borderRadius:'var(--rp)', background:`${sc.archetype.color}15`, border:`1px solid ${sc.archetype.color}30`, fontSize:11, fontWeight:600, color:sc.archetype.color }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'experience' && (
        <div>
          {cand.workExp && cand.workExp.length > 0 ? cand.workExp.map((wx, i) => (
            <div key={i} style={{ padding:'12px 14px', borderRadius:'var(--r)', background:'rgba(255,255,255,.03)', border:'1px solid var(--border)', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:5 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700 }}>{wx.role || wx.title}</div>
                  <div style={{ fontSize:12, color:'var(--text2)', marginTop:1 }}>{wx.co || wx.company} · {wx.period || wx.years}</div>
                </div>
                <span style={{ fontSize:11, color:'var(--text3)', flexShrink:0, marginLeft:12 }}>{wx.yrs || wx.period}</span>
              </div>
              <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.65, margin:'0 0 8px' }}>{wx.desc || wx.description}</p>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {wx.chips?.map(c => <span key={c.l} className={`chip ${c.c}`} style={{ fontSize:11 }}>{c.l}</span>)}
              </div>
            </div>
          )) : (
            <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text3)', fontSize:13 }}>No experience details provided.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EmpCandidates() {
  const { showToast, navigate } = useApp();
  const { profile } = useAuth();
  const [dbJobs,        setDbJobs]        = useState([]);
  const [applications,  setApplications]  = useState([]);
  const [candidates,    setCandidates]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedJobId, setSelectedJobId] = useState(null);

  useEffect(() => {
    if (!profile?.id) return;
    const qJobs = query(collection(db, 'jobs'), where('employerId', '==', profile.id));
    const unsubJobs = onSnapshot(qJobs, (snapshot) => {
      const jobs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setDbJobs(jobs);
      setSelectedJobId(prev => prev ?? jobs[0]?.id ?? null);
    }, err => console.error('EmpCandidates jobs error', err));

    const qApps = query(collection(db, 'applications'), where('employerId', '==', profile.id));
    const unsubApps = onSnapshot(qApps, (snapshot) => {
      const apps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setApplications(apps);
    }, err => { console.error('EmpCandidates apps error', err); setLoading(false); });

    return () => { unsubJobs(); unsubApps(); };
  }, [profile?.id]);

  useEffect(() => {
    const fetchCandidates = async () => {
      const candIds = [...new Set(applications.map(a => a.candidateId))];
      if (candIds.length === 0) { setLoading(false); return; }
      const cands = [];
      const chunks = [];
      for (let i = 0; i < candIds.length; i += 30) chunks.push(candIds.slice(i, i + 30));
      for (const chunk of chunks) {
        try {
          const snap = await getDocs(query(collection(db, 'users'), where('id', 'in', chunk)));
          snap.docs.forEach(d => {
            if (!cands.find(c => c.id === d.id)) {
              cands.push({ id: d.id, ...d.data() });
            }
          });
        } catch (e) {
          console.error("Error fetching candidate chunk:", e);
        }
      }
      setCandidates(cands);
      setLoading(false);
    };
    if (applications.length > 0) fetchCandidates();
    else if (dbJobs.length > 0)  setLoading(false);
  }, [applications, dbJobs.length]);

  const activeJob = useMemo(() =>
    dbJobs.find(j => j.id === selectedJobId) || dbJobs[0] || null,
  [dbJobs, selectedJobId]);

  const scoredCandidates = useMemo(() => {
    if (!activeJob) return [];
    return candidates
      .map(c => {
        const app = applications.find(a => a.candidateId === c.id && a.jobId === activeJob.id);
        if (!app) return null;
        const scores = scoreCandidateForJob(c, activeJob);
        return {
          ...c,
          name:      c.full_name || c.name || 'Candidate',
          role:      c.job_title || c.role || 'Candidate',
          exp:       c.experience_years || '',
          salary:    c.target_salary ? `£${c.target_salary}k` : '',
          notice:    c.notice_period || '',
          initials:  (c.full_name || c.name || '??').split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2),
          grad:      c.grad || 'linear-gradient(135deg,#6c47ff,#4338ca)',
          workExp:   c.work_experience || c.workExp || [],
          candidateExpressedInterest: app.candidateExpressedInterest || false,
          employerExpressedInterest:  app.employerExpressedInterest  || false,
          status:       app.status || 'matched',
          currentStage: app.stage  || 'Matched',
          applicationId: app.id,
          scores,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.candidateExpressedInterest !== a.candidateExpressedInterest)
          return b.candidateExpressedInterest ? 1 : -1;
        return b.scores.overall - a.scores.overall;
      });
  }, [candidates, applications, activeJob]);

  const [selectedId, setSelectedId] = useState(null);
  const selected = useMemo(() => {
    if (selectedId) return scoredCandidates.find(c => c.id === selectedId) || scoredCandidates[0];
    return scoredCandidates[0];
  }, [selectedId, scoredCandidates]);

  const [filter, setFilter] = useState('All');
  const visible = useMemo(() => {
    return scoredCandidates.filter(c => {
      if (filter === 'Interested') return c.candidateExpressedInterest;
      if (filter === 'Mutual')     return c.candidateExpressedInterest && c.employerExpressedInterest;
      if (filter === 'DNA 90%+')   return c.scores.dna >= 90;
      return true;
    });
  }, [scoredCandidates, filter]);

  const matchedCount    = scoredCandidates.length;
  const interestedCount = scoredCandidates.filter(c => c.candidateExpressedInterest).length;
  const mutualCount     = scoredCandidates.filter(c => c.candidateExpressedInterest && c.employerExpressedInterest).length;
  const avgDna          = matchedCount ? Math.round(scoredCandidates.reduce((s, c) => s + c.scores.dna, 0) / matchedCount) : 0;

  // ── Express interest: notify candidate, fire mutual match if both sides are in ──
  async function handleExpressInterest(cand) {
    if (!activeJob) return;
    const app = applications.find(a => a.candidateId === cand.id && a.jobId === activeJob.id);
    try {
      if (existing) {
        await updateDoc(appRef, {
          employerExpressedInterest: true,
          updatedAt: serverTimestamp(),
        });
      } else {
        const docId = `${cand.id}_${activeJob.id}`;
        await setDoc(doc(db, 'applications', docId), {
          id: docId,
          jobId: activeJob.id,
          candidateId: cand.id,
          employerId: profile.id,
          matchScore: cand.scores.overall,
          dnaScore: cand.scores.dna,
          skillsScore: cand.scores.skills,
          employerExpressedInterest: true,
          candidateExpressedInterest: false,
          status: 'matched',
          stage: 'Matched',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      // Notify candidate
      await addDoc(collection(db, 'notifications'), {
        userId: cand.id,
        title: '✨ An employer is interested in you',
        message: `${profile?.company_name || 'An employer'} expressed interest in you for the ${activeJob.title} role.`,
        type: 'match',
        route: 'cand-matches',
        read: false,
        createdAt: serverTimestamp(),
      });
      // Log ghost event: employer made first contact with this candidate
      logGhostEvent(cand.id, profile.id, activeJob.id, 'first_contact', {
        stage: 'matched',
      });
      showToast(`Interest expressed in ${cand.name} — they'll be notified 🎉`, 'success');
    } catch (err) {
      console.error('Express interest error:', err);
      showToast('Failed to express interest — try again', 'error');
    }
  }

  async function handleStageChange(candId, stage) {
    const app = applications.find(a => a.candidateId === candId && a.jobId === activeJob?.id);
    if (app) {
      const prevStage = app.stage || 'matched';
      await updateDoc(doc(db, 'applications', app.id), { stage, updatedAt: serverTimestamp() });
      // Log ghost event for this stage move
      const ghostType = ghostTypeForMove(prevStage, stage);
      if (ghostType && profile?.id && activeJob?.id) {
        logGhostEvent(candId, profile.id, activeJob.id, ghostType, {
          stage, prevStage,
        });
      }
    }
  }

  function handleMessage(cand) {
    showToast(`Conversation opened with ${cand.name}`, 'success');
  }

  if (!loading && dbJobs.length === 0) {
    return (
      <div className="view" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center', maxWidth:360 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🧬</div>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>No active roles</div>
          <div style={{ fontSize:13, color:'var(--text3)', marginBottom:20 }}>Post a role to start seeing DNA-matched candidates.</div>
          <button className="btn btn-violet" onClick={() => navigate('emp-create-job')}>+ Post your first role</button>
        </div>
      </div>
    );
  }

  if (loading && profile?.id) {
    return <div className="view" style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)' }}>Loading candidates…</div>;
  }

  return (
    <div className="view" style={{ flexDirection:'row', overflow:'hidden' }}>
      <div style={{ display:'flex', flex:1, overflow:'hidden', flexDirection:'column' }}>

        {/* Job selector */}
        <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', flexShrink:0, display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text3)', flexShrink:0 }}>Viewing role</div>
          <select className="sel" value={selectedJobId || ''} onChange={e => { setSelectedJobId(e.target.value); setSelectedId(null); setFilter('All'); }} style={{ flex:1, maxWidth:340, fontWeight:600 }}>
            {dbJobs.map(j => <option key={j.id} value={j.id}>{j.title} · {j.companyName || profile?.company_name || ''}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('emp-create-job')}>+ Post role</button>
        </div>

        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
          {/* Left: candidate list */}
          <div style={{ width:310, flexShrink:0, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:10, color:'var(--text2)' }}>
                {activeJob?.title}
                <span style={{ fontSize:11, fontWeight:400, color:'var(--text3)', marginLeft:6 }}>{matchedCount} in pool</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:5, marginBottom:10 }}>
                {[
                  { lbl:'In pool',    val:matchedCount,    col:'var(--text)' },
                  { lbl:'Interested', val:interestedCount, col:'var(--cyan)' },
                  { lbl:'Mutual',     val:mutualCount,     col:'var(--green)' },
                ].map(s => (
                  <div key={s.lbl} style={{ textAlign:'center', padding:'5px', borderRadius:'var(--r)', background:'rgba(255,255,255,.03)', border:'1px solid var(--border)' }}>
                    <div style={{ fontFamily:'Manrope,sans-serif', fontSize:14, fontWeight:800, color:s.col }}>{s.val}</div>
                    <div style={{ fontSize:9, color:'var(--text3)', marginTop:1 }}>{s.lbl}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:10 }}>
                Avg DNA fit: <strong style={{ color:'var(--text2)' }}>{avgDna}%</strong>
                {interestedCount > 0 && <span style={{ marginLeft:10 }}>Candidate interest: <strong style={{ color:'var(--cyan)' }}>{interestedCount}</strong></span>}
              </div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {['All','Interested','Mutual','DNA 90%+'].map(f => (
                  <span key={f} onClick={() => setFilter(f)} className={`fchip${filter===f?' on':''}`} style={{ cursor:'pointer', fontSize:11 }}>{f}</span>
                ))}
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'8px 10px' }}>
              {visible.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text3)', fontSize:12 }}>
                  {filter==='All' ? 'No matched candidates yet.' : `No candidates in "${filter}" filter.`}
                </div>
              ) : visible.map(c => (
                <CandRow key={c.id} cand={c} isSelected={selected?.id===c.id} onClick={() => setSelectedId(c.id)} />
              ))}
            </div>
          </div>

          {/* Right: detail panel */}
          {selected ? (
            <CandDetail cand={selected} job={activeJob} onStageChange={handleStageChange} onMessage={handleMessage} onMatchBack={handleExpressInterest} />
          ) : (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:13 }}>Select a candidate to view their profile</div>
          )}
        </div>
      </div>
    </div>
  );
}
