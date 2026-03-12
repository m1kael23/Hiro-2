import { useState, useMemo, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  scoreJobForCandidate,
  DEFAULT_CANDIDATE,
  getScoreColour,
  getScoreLabel,
} from '../../lib/matchStore';

// ─── Score ring ──────────────────────────────────────────
function ScoreRing({ value, size = 44, color }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="3" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        fontSize="10" fontWeight="800" fill={color} fontFamily="Manrope,sans-serif">{value}</text>
    </svg>
  );
}

// ─── DNA dimension bar row ────────────────────────────────
function DnaRow({ b }) {
  const col = getScoreColour(b.fit);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <span style={{ fontSize:13, width:18, flexShrink:0 }}>{b.icon}</span>
      <span style={{ fontSize:11, color:'var(--text2)', width:116, flexShrink:0 }}>{b.dim}</span>
      <div style={{ flex:1, position:'relative', height:5, borderRadius:999, background:'rgba(255,255,255,.08)' }}>
        {/* candidate fill */}
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${b.candVal}%`, borderRadius:999, background:col, opacity:.75 }} />
        {/* job target dot */}
        <div style={{ position:'absolute', top:'50%', left:`${b.jobVal}%`, transform:'translate(-50%,-50%)', width:9, height:9, borderRadius:'50%', background:'#fff', border:'1.5px solid rgba(0,0,0,.5)', boxShadow:'0 0 5px rgba(255,255,255,.5)' }} />
      </div>
      <span style={{ fontSize:11, fontWeight:700, color:col, width:26, textAlign:'right', flexShrink:0 }}>{b.fit}%</span>
    </div>
  );
}

// ─── Match card (left list) ───────────────────────────────
function MatchCard({ job, isSelected, onClick }) {
  const { navigate, setSelectedEmployerId } = useApp();
  const sc  = job.scores;
  const col = getScoreColour(sc.overall);
  return (
    <div
      onClick={onClick}
      style={{
        padding:'11px 12px', borderRadius:'var(--r)', marginBottom:6, cursor:'pointer',
        border:`1px solid ${isSelected ? 'rgba(108,71,255,.5)' : job.mutual ? 'rgba(34,197,94,.25)' : 'var(--border)'}`,
        background: isSelected ? 'rgba(108,71,255,.08)' : job.mutual ? 'rgba(34,197,94,.04)' : 'rgba(255,255,255,.02)',
        transition:'all .15s',
      }}
    >
      <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:7 }}>
        <div style={{ fontSize:20, flexShrink:0, marginTop:1 }}>{job.emoji}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{job.title}</div>
          {job.mutual
            ? <div style={{ fontSize:11, color:'var(--green)', fontWeight:600 }}>
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (job.employerId) {
                      setSelectedEmployerId(job.employerId);
                      navigate('cand-company');
                    }
                  }}
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {job.co}
                </span> · Mutual match ✓
              </div>
            : <div style={{ fontSize:11, color:'var(--text2)' }}>
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (job.employerId) {
                      setSelectedEmployerId(job.employerId);
                      navigate('cand-company');
                    }
                  }}
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {job.co}
                </span> · {job.salary}
              </div>
          }
        </div>
        <ScoreRing value={sc.overall} size={40} color={col} />
      </div>
      {/* sub-scores */}
      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
        <span style={{ padding:'2px 7px', borderRadius:'var(--rp)', background:'rgba(236,72,153,.1)', border:'1px solid rgba(236,72,153,.2)', fontSize:10, fontWeight:700, color:'#f9a8d4' }}>🧬 {sc.dna}%</span>
        <span style={{ padding:'2px 7px', borderRadius:'var(--rp)', background:'rgba(56,189,248,.08)', border:'1px solid rgba(56,189,248,.18)', fontSize:10, fontWeight:600, color:'var(--cyan)' }}>Skills {sc.skills}%</span>
        <span style={{ padding:'2px 7px', borderRadius:'var(--rp)', background:'rgba(255,255,255,.04)', border:'1px solid var(--border)', fontSize:10, color:'var(--text3)' }}>{job.remote}</span>
      </div>
    </div>
  );
}

// ─── Detail panel (right side) ───────────────────────────
function DetailPanel({ job, interested, applied, onInterest, onApply }) {
  const { navigate, setSelectedEmployerId } = useApp();
  const sc        = job.scores;
  const col       = getScoreColour(sc.overall);

  // Auto-generate "why DNA" explanation from computed breakdown
  const goodDims = (sc.breakdown || []).filter(b => b.fit >= 80);
  const weakDims = (sc.breakdown || []).filter(b => b.fit < 68);

  const whyDNA = goodDims.length > 0
    ? `${goodDims.map(b => b.dim).slice(0,2).join(' and ')} align strongly with this team's working style.`
      + (weakDims.length > 0 ? ` Watch out: ${weakDims[0].dim?.toLowerCase()} is a potential friction point worth discussing.` : ' Overall strong culture fit.')
    : 'Moderate DNA alignment — worth exploring cultural fit in early conversations.';

  const dnaWarn = weakDims.length > 0
    ? `${weakDims[0].dim}: your score is ${weakDims[0].candVal}, team target is ${weakDims[0].jobVal}. Raise in the first conversation.`
    : null;

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'20px 24px 40px' }}>

      {/* ── Header ─────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:20 }}>
        <div style={{ width:54, height:54, borderRadius:14, background:'rgba(255,255,255,.06)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>{job.emoji}</div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
            <span style={{ fontSize:20, fontWeight:700 }}>{job.title}</span>
            {job.mutual && <span style={{ padding:'3px 9px', borderRadius:'var(--rp)', background:'rgba(34,197,94,.12)', border:'1px solid rgba(34,197,94,.3)', fontSize:11, fontWeight:700, color:'var(--green)' }}>🤝 Mutual</span>}
          </div>
          <div style={{ fontSize:13, color:'var(--text2)' }}>
            <span 
              onClick={() => {
                if (job.employerId) {
                  setSelectedEmployerId(job.employerId);
                  navigate('cand-company');
                }
              }}
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
            >
              {job.co}
            </span> · {job.salary} · {job.location}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={interested ? 'btn btn-ghost' : 'btn btn-violet'}
            onClick={onInterest}
            style={{ flexShrink:0 }}
          >{interested ? '✓ Interest sent' : 'Express interest →'}</button>
          <button
            className={applied ? 'btn btn-ghost' : 'btn btn-violet'}
            onClick={onApply}
            style={{ 
              flexShrink:0, 
              background: applied ? 'rgba(255,255,255,.05)' : 'var(--violet)',
              opacity: applied ? 0.6 : 1,
              cursor: applied ? 'default' : 'pointer'
            }}
            disabled={applied}
          >{applied ? '✓ Applied' : 'Apply Now'}</button>
        </div>
      </div>

      {/* ── Score cards ─────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
        {[
          { label:'Hiro Fit',    val:sc.overall, sub:getScoreLabel(sc.overall), col },
          { label:'🧬 DNA fit',  val:sc.dna,     sub:'Culture & working style',  col:'#f9a8d4' },
          { label:'Skills fit',  val:sc.skills,  sub:'Verified skills overlap',  col:'var(--cyan)' },
        ].map(r => (
          <div key={r.label} style={{ padding:'14px 12px', borderRadius:'var(--r)', background:'rgba(255,255,255,.03)', border:'1px solid var(--border)', textAlign:'center' }}>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>{r.label}</div>
            <div style={{ fontFamily:'Manrope,sans-serif', fontSize:26, fontWeight:800, color:r.col, lineHeight:1 }}>{r.val}%</div>
            <div style={{ fontSize:10, color:'var(--text3)', marginTop:4 }}>{r.sub}</div>
          </div>
        ))}
      </div>

      {/* ── DNA explanation ─────────────────────────── */}
      <div style={{ marginBottom:16, padding:'13px 15px', borderRadius:'var(--r)', background:'rgba(236,72,153,.05)', border:'1px solid rgba(236,72,153,.2)' }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#f9a8d4', marginBottom:7 }}>🧬 Why this DNA score</div>
        <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.65, margin:'0 0 8px' }}>{whyDNA}</p>
        {dnaWarn && (
          <div style={{ display:'flex', gap:8, padding:'9px 11px', borderRadius:'var(--r)', background:'rgba(245,158,11,.07)', border:'1px solid rgba(245,158,11,.25)', fontSize:12, color:'var(--amber)' }}>
            <span>⚠</span><span>{dnaWarn}</span>
          </div>
        )}
      </div>

      {/* ── DNA dimension breakdown ─────────────────── */}
      {sc.breakdown && sc.breakdown.length > 0 && (
        <div style={{ marginBottom:16, padding:'13px 15px', borderRadius:'var(--r)', background:'rgba(255,255,255,.02)', border:'1px solid var(--border)' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text3)', marginBottom:11 }}>Work DNA vs role requirements</div>
          <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
            {sc.breakdown.map(b => <DnaRow key={b.dim} b={b} />)}
          </div>
          <div style={{ fontSize:10, color:'var(--text3)', marginTop:9 }}>Bar = your position · ⚪ dot = role target · score = dimension alignment</div>
        </div>
      )}

      {/* ── Skills match ───────────────────────────── */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text3)', marginBottom:8 }}>Skills match breakdown</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {job.skillsRequired.map(skill => {
            const has = DEFAULT_CANDIDATE.skills.map(s => s.toLowerCase()).includes(skill.toLowerCase());
            return (
              <span key={skill} style={{ padding:'4px 11px', borderRadius:'var(--rp)', fontSize:12, fontWeight:600, background: has ? 'rgba(34,197,94,.1)' : 'rgba(251,113,133,.08)', border:`1px solid ${has ? 'rgba(34,197,94,.28)' : 'rgba(251,113,133,.22)'}`, color: has ? 'var(--green)' : 'var(--red)' }}>
                {has ? '✓' : '–'} {skill}
              </span>
            );
          })}
          {job.skillsNice.map(skill => {
            const has = DEFAULT_CANDIDATE.skills.map(s => s.toLowerCase()).includes(skill.toLowerCase());
            return (
              <span key={skill} style={{ padding:'4px 11px', borderRadius:'var(--rp)', fontSize:12, fontWeight:500, background:'rgba(255,255,255,.04)', border:'1px solid var(--border)', color: has ? 'var(--cyan)' : 'var(--text3)' }}>
                {has ? '✓ ' : ''}{skill} <span style={{ opacity:.5 }}>(nice)</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Salary fit ─────────────────────────────── */}
      <div style={{ marginBottom:16, padding:'11px 13px', borderRadius:'var(--r)', background: sc.salaryFit==='great' ? 'rgba(34,197,94,.05)' : sc.salaryFit==='ok' ? 'rgba(245,158,11,.05)' : 'rgba(251,113,133,.05)', border:`1px solid ${sc.salaryFit==='great' ? 'rgba(34,197,94,.22)' : sc.salaryFit==='ok' ? 'rgba(245,158,11,.22)' : 'rgba(251,113,133,.18)'}`, fontSize:12, color:'var(--text2)' }}>
        <span style={{ fontWeight:700, color: sc.salaryFit==='great' ? 'var(--green)' : sc.salaryFit==='ok' ? 'var(--amber)' : 'var(--red)' }}>
          {sc.salaryFit==='great' ? '✓ Salary match' : sc.salaryFit==='ok' ? '~ Salary close' : '⚠ Salary stretch'}
        </span>
        {' '}— Role {job.salary} · Your target £{DEFAULT_CANDIDATE.salaryMin}–{DEFAULT_CANDIDATE.salaryMax}k
      </div>

      {/* ── Quick stats ────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:20 }}>
        {[
          { lbl:'Posted',        val:`${job.daysLive}d ago` },
          { lbl:'Response rate', val:`${job.responseRate}%`, col:'var(--green)' },
          { lbl:'Avg to offer',  val:`${job.avgDays} days` },
          { lbl:'Hiro Score',    val:`${job.hiroScore}/10`, col:'#a78bfa' },
        ].map(r => (
          <div key={r.lbl} style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', borderRadius:'var(--r)', background:'rgba(255,255,255,.03)', border:'1px solid var(--border)', fontSize:12 }}>
            <span style={{ color:'var(--text3)' }}>{r.lbl}</span>
            <span style={{ fontWeight:700, color: r.col || 'var(--text)' }}>{r.val}</span>
          </div>
        ))}
      </div>

      {/* ── What you'll own ────────────────────────── */}
      <div style={{ marginBottom:20, padding:'13px 15px', borderRadius:'var(--r)', background:'rgba(255,255,255,.03)', border:'1px solid var(--border)' }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text3)', marginBottom:8 }}>What you&apos;ll own</div>
        <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>{job.outcome}</div>
      </div>

      {/* ── CTAs ───────────────────────────────────── */}
      <div style={{ display:'flex', gap:10 }}>
        <button className={interested ? 'btn btn-ghost' : 'btn btn-violet'} style={{ flex:1, justifyContent:'center' }} onClick={onInterest}>
          {interested ? '✓ Interest sent' : 'Express interest →'}
        </button>
        <button 
          className={applied ? 'btn btn-ghost' : 'btn btn-violet'} 
          style={{ 
            flex:1, 
            justifyContent:'center', 
            background: applied ? 'rgba(255,255,255,.05)' : 'var(--violet)',
            opacity: applied ? 0.6 : 1,
            cursor: applied ? 'default' : 'pointer'
          }} 
          onClick={onApply}
          disabled={applied}
        >
          {applied ? '✓ Applied' : 'Apply Now'}
        </button>
        <button className="btn btn-ghost" style={{ flexShrink:0 }}>🔐 {job.dnaMembers?.split(' ')[0]} Vault reports</button>
      </div>

    </div>
  );
}

// ─── Main view ────────────────────────────────────────────
const SORT_OPTIONS = ['Best match', 'DNA fit', 'Mutual first', 'Salary'];

export default function CandMatches() {
  const { showToast } = useApp();
  const { profile } = useAuth();
  const { markRouteRead } = useNotifications();
  const [dbJobs, setDbJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);

  const candidate = profile || DEFAULT_CANDIDATE;

  useEffect(() => {
    markRouteRead('cand-matches');
  }, [markRouteRead]);

  useEffect(() => {
    const q = query(collection(db, 'jobs'), where('status', '==', 'live'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobs = snapshot.docs.map(doc => {
        const data = doc.data() || {};
        return {
          id: doc.id,
          ...data,
          employerId: data.employerId || '', // Ensure employerId is present
          // Ensure fields exist for matching engine
          dnaPrefs: data.dnaPrefs || [50, 50, 50, 50, 50, 50, 50],
          skillsRequired: data.skillsRequired || [],
          skillsNice: data.skillsNice || [],
          salaryMin: data.salMin || 0,
          salaryMax: data.salMax || 0,
          co: data.companyName || 'Unknown',
          emoji: data.emoji || '💼',
          salary: `${data.currency || '£'}${data.salMin || 0}k–${data.salMax || 0}k`,
          daysLive: data.daysLive || 0,
          responseRate: data.responseRate || 100,
          avgDays: data.avgDays || 14,
          dnaMembers: data.dnaMembers || '1 member ✓',
          outcome: data.outcome || data.outcome6m || 'Job description pending...',
        };
      });
      setDbJobs(jobs);
    }, (error) => {
      console.error('Error fetching jobs:', error);
    });
    return () => unsubscribe();
  }, []);

  // Fetch candidate's applications
  useEffect(() => {
    if (!profile?.id) return;
    const q = query(collection(db, 'applications'), where('candidateId', '==', profile.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error('CandMatches: applications snapshot error', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [profile?.id]);

  const scoredJobs = useMemo(() => {
    return dbJobs.map(job => {
      const app = applications.find(a => a.jobId === job.id);
      return {
        ...job,
        mutual: app?.status === 'matched' || app?.status === 'hired',
        candidateExpressedInterest: app?.candidateExpressedInterest || false,
        scores: scoreJobForCandidate(candidate, job),
      };
    }).sort((a, b) => b.scores.overall - a.scores.overall);
  }, [dbJobs, candidate, applications]);

  const [selectedId, setSelectedId] = useState(null);
  const [remoteFilter, setRemoteFilter] = useState('All');
  const [salaryFilter, setSalaryFilter] = useState('All');
  const [fitFilter, setFitFilter] = useState('All');
  const [sortBy,     setSortBy]     = useState('Best match');

  const interested = useMemo(() => {
    const res = {};
    applications.forEach(a => {
      if (a.candidateExpressedInterest) res[a.jobId] = true;
    });
    return res;
  }, [applications]);

  const applied = useMemo(() => {
    const res = {};
    applications.forEach(a => {
      if (a.status === 'applied' || (a.stage && a.stage !== 'matched')) res[a.jobId] = true;
    });
    return res;
  }, [applications]);

  const selected = useMemo(() => {
    if (selectedId) return scoredJobs.find(j => j.id === selectedId);
    return scoredJobs[0];
  }, [selectedId, scoredJobs]);

  const visible = useMemo(() => {
    let list = scoredJobs;

    if (remoteFilter !== 'All') {
      list = list.filter(j => j.remote === remoteFilter);
    }
    if (salaryFilter !== 'All') {
      const min = parseInt(salaryFilter);
      list = list.filter(j => j.salaryMax >= min);
    }
    if (fitFilter !== 'All') {
      const min = parseInt(fitFilter);
      list = list.filter(j => j.scores.overall >= min);
    }

    if (sortBy === 'DNA fit')      list = [...list].sort((a,b) => b.scores.dna - a.scores.dna);
    if (sortBy === 'Mutual first') list = [...list].sort((a,b) => (b.mutual?1:0) - (a.mutual?1:0));
    if (sortBy === 'Salary')       list = [...list].sort((a,b) => b.salaryMax - a.salaryMax);
    return list;
  }, [scoredJobs, remoteFilter, salaryFilter, fitFilter, sortBy]);

  // Stats computed from live scores
  const mutualCount  = scoredJobs.filter(j => j.mutual).length;
  const avgDna       = scoredJobs.length ? Math.round(scoredJobs.reduce((s,j) => s + j.scores.dna, 0) / scoredJobs.length) : 0;
  const topScore     = scoredJobs.length ? Math.max(...scoredJobs.map(j => j.scores.overall)) : 0;

  async function handleInterest(jobId) {
    if (!profile?.id) {
      showToast('Please sign in to express interest', 'error');
      return;
    }

    if (interested[jobId]) {
      setConfirmRemoveId(jobId);
      return;
    }

    const job = scoredJobs.find(j => j.id === jobId);
    if (!job) return;

    const appId = `${profile.id}_${jobId}`;
    const appRef = doc(db, 'applications', appId);

    try {
      await setDoc(appRef, {
        id: appId,
        jobId: jobId,
        candidateId: profile.id,
        employerId: job.employerId,
        candidateExpressedInterest: true,
        status: 'pending',
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true });

      // Create notification for employer
      if (job.employerId) {
        await addDoc(collection(db, 'notifications'), {
          userId: job.employerId,
          title: 'New Interest!',
          message: `${profile.full_name || 'A candidate'} is interested in your ${job.title} role.`,
          type: 'interest',
          route: 'emp-candidates',
          read: false,
          createdAt: serverTimestamp()
        });
      }

      showToast(`Interest sent to ${job?.co || 'Company'} ✓`, 'success');
    } catch (err) {
      console.error('Error expressing interest:', err);
      showToast('Failed to send interest', 'error');
    }
  }

  async function removeInterest(id) {
    if (!profile?.id) return;
    const appId = `${profile.id}_${id}`;
    const appRef = doc(db, 'applications', appId);
    try {
      await setDoc(appRef, {
        candidateExpressedInterest: false,
        updatedAt: serverTimestamp()
      }, { merge: true });
      showToast('Interest removed', 'success');
      setConfirmRemoveId(null);
    } catch (err) {
      console.error('Error removing interest:', err);
      showToast('Failed to remove interest', 'error');
    }
  }

  async function handleApply(jobId) {
    if (!profile?.id) {
      showToast('Please sign in to apply', 'error');
      return;
    }

    if (applied[jobId]) return;

    const job = scoredJobs.find(j => j.id === jobId);
    if (!job) return;

    const appId = `${profile.id}_${jobId}`;
    const appRef = doc(db, 'applications', appId);

    try {
      await setDoc(appRef, {
        id: appId,
        jobId: jobId,
        candidateId: profile.id,
        employerId: job.employerId,
        candidateExpressedInterest: true,
        status: 'applied',
        stage: 'screen',
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true });

      // Create notification for employer
      if (job.employerId) {
        await addDoc(collection(db, 'notifications'), {
          userId: job.employerId,
          title: 'New Application!',
          message: `${profile.full_name || 'A candidate'} applied for your ${job.title} role.`,
          type: 'application',
          route: 'emp-pipeline',
          read: false,
          createdAt: serverTimestamp()
        });
      }

      showToast(`Application submitted to ${job?.co || 'Company'} ✓`, 'success');
    } catch (err) {
      console.error('Error applying:', err);
      showToast('Failed to submit application', 'error');
    }
  }

  if (loading) {
    return (
      <div className="view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text3)' }}>Finding your best matches...</div>
      </div>
    );
  }

  return (
    <div className="view" style={{ flexDirection:'row', overflow:'hidden' }}>
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* ── LEFT: list ──────────────────────────────── */}
        <div style={{ width:340, flexShrink:0, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Stats strip */}
          <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>Matches <span style={{ fontSize:12, fontWeight:400, color:'var(--text3)' }}>{scoredJobs.length}</span></div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sel" style={{ fontSize:11, padding:'3px 8px', width:'auto' }}>
                {SORT_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            {/* Mini stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:10 }}>
              {[
                { lbl:'Mutual',   val:mutualCount, col:'var(--green)' },
                { lbl:'Avg DNA',  val:`${avgDna}%`, col:'#f9a8d4' },
                { lbl:'Top fit',  val:`${topScore}%`, col:'var(--cyan)' },
              ].map(s => (
                <div key={s.lbl} style={{ textAlign:'center', padding:'6px', borderRadius:'var(--r)', background:'rgba(255,255,255,.03)', border:'1px solid var(--border)' }}>
                  <div style={{ fontFamily:'Manrope,sans-serif', fontSize:15, fontWeight:800, color:s.col }}>{s.val}</div>
                  <div style={{ fontSize:10, color:'var(--text3)', marginTop:1 }}>{s.lbl}</div>
                </div>
              ))}
            </div>
            {/* Filter dropdowns */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <select className="sel-mini" value={remoteFilter} onChange={e => setRemoteFilter(e.target.value)}>
                <option value="All">Location</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Office">Office</option>
              </select>
              <select className="sel-mini" value={salaryFilter} onChange={e => setSalaryFilter(e.target.value)}>
                <option value="All">Salary</option>
                <option value="80">£80k+</option>
                <option value="100">£100k+</option>
                <option value="120">£120k+</option>
                <option value="150">£150k+</option>
              </select>
              <select className="sel-mini" value={fitFilter} onChange={e => setFitFilter(e.target.value)}>
                <option value="All">Hiro Fit</option>
                <option value="80">80%+</option>
                <option value="90">90%+</option>
                <option value="95">95%+</option>
              </select>
            </div>
          </div>

          {/* Cards */}
          <div style={{ flex:1, overflowY:'auto', padding:'8px 10px' }}>
            {/* Mutual group */}
            {visible.some(j => j.mutual) && (
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--green)', padding:'4px 2px 6px' }}>🤝 Mutual matches</div>
            )}
            {visible.filter(j => j.mutual).map(j => (
              <MatchCard key={j.id} job={j} isSelected={selected?.id===j.id} onClick={() => setSelectedId(j.id)} />
            ))}
            {/* Other group */}
            {visible.some(j => !j.mutual) && (
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text3)', padding:'10px 2px 6px' }}>Other matches</div>
            )}
            {visible.filter(j => !j.mutual).map(j => (
              <MatchCard key={j.id} job={j} isSelected={selected?.id===j.id} onClick={() => setSelectedId(j.id)} />
            ))}
          </div>
        </div>

        {/* ── RIGHT: detail ───────────────────────────── */}
        {selected && (
          <DetailPanel
            job={selected}
            interested={!!interested[selected.id]}
            applied={!!applied[selected.id]}
            onInterest={() => handleInterest(selected.id)}
            onApply={() => handleApply(selected.id)}
          />
        )}
      </div>
      {/* Confirmation Modal */}
      {confirmRemoveId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 24, maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>🤔</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Remove interest?</div>
            <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24 }}>
              Are you sure you want to remove your interest in this role? The employer will no longer see you in their interested list and this action may slightly affect your Reliability Score
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmRemoveId(null)}>Cancel</button>
              <button className="btn-violet" style={{ flex: 1, background: 'var(--red)' }} onClick={() => removeInterest(confirmRemoveId)}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
