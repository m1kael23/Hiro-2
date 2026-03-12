import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function EmpDashboard() {
  const { navigate } = useApp();
  const { profile } = useAuth();

  const [jobs,         setJobs]         = useState([]);
  const [pipeline,     setPipeline]     = useState({ applied:0, shortlist:0, interview:0, final:0, offer:0 });
  const [mutualCount,  setMutualCount]  = useState(0);
  const [loading,      setLoading]      = useState(true);

  const employerId = profile?.id;

  // ── Live jobs ─────────────────────────────────────────────────
  useEffect(() => {
    if (!employerId) return;
    const q = query(
      collection(db, 'jobs'),
      where('employerId', '==', employerId),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    return onSnapshot(q, snap => {
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => { console.error('jobs snap', err); setLoading(false); });
  }, [employerId]);

  // ── Applications → pipeline counts ───────────────────────────
  useEffect(() => {
    if (!employerId) return;
    const q = query(
      collection(db, 'applications'),
      where('employerId', '==', employerId)
    );
    return onSnapshot(q, snap => {
      const counts = { applied:0, shortlist:0, interview:0, final:0, offer:0 };
      let mutual = 0;
      snap.docs.forEach(d => {
        const data = d.data();
        const stage = (data.stage || 'applied').toLowerCase();
        if (counts[stage] !== undefined) counts[stage]++;
        if (data.candidateExpressedInterest && data.employerExpressedInterest) mutual++;
      });
      setPipeline(counts);
      setMutualCount(mutual);
    }, err => console.error('apps snap', err));
  }, [employerId]);

  const liveJobs   = jobs.filter(j => j.status === 'live');
  const totalApps  = Object.values(pipeline).reduce((a,b) => a+b, 0);
  const weekNum    = Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / 604800000);

  return (
    <div className="view-panel">
      <div className="scroll">
        <div className="page-hdr">
          <div>
            <div className="eyebrow">{greeting()}</div>
            <div className="page-title">Hiring command centre</div>
            <div className="page-sub">
              {profile?.company_name || 'Your company'} · Week {weekNum} · {loading ? '…' : `${liveJobs.length} active role${liveJobs.length !== 1 ? 's' : ''}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('emp-create-job')}>+ Post role</button>
            <button className="btn btn-violet btn-sm" onClick={() => navigate('emp-pipeline')}>View pipeline →</button>
          </div>
        </div>

        {/* Hiro Score banner */}
        <div style={{
          background: 'linear-gradient(135deg,#0a1a35 0%,#120830 55%,#001520 100%)',
          border: '1px solid rgba(108,71,255,0.3)', borderRadius: 'var(--rx)',
          padding: '18px 22px', marginBottom: 16, position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(108,71,255,0.25),transparent 70%)' }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 24 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(139,92,246,0.8)', marginBottom: 4 }}>Hiro Score™</div>
              <div style={{ fontFamily: 'Manrope', fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                8.7<span style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)' }}>/10</span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Top 14% of employers on Hiro</div>
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[
                { label: 'Response rate', val: '94%',  color: 'var(--green)' },
                { label: 'Avg process',   val: '14d',  color: 'var(--cyan)'  },
                { label: 'Offer accept',  val: '88%',  color: '#a78bfa'      },
                { label: 'Candidate NPS', val: '72',   color: 'var(--amber)' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontFamily: 'Manrope', fontSize: 18, fontWeight: 800, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stat tiles — real data */}
        <div className="g4" style={{ marginBottom: 14 }}>
          {[
            { eyebrow: 'Active roles',   val: loading ? '…' : String(liveJobs.length),  label: liveJobs.slice(0,2).map(j=>j.title||'Role').join(' · ') || 'No active roles', glow: 'rgba(108,71,255,0.3)', color: '#a78bfa',         delta: 'Live now',          up: true  },
            { eyebrow: 'Pipeline',       val: loading ? '…' : String(totalApps),         label: 'Candidates across all roles',                                                  glow: 'rgba(56,189,248,0.2)',  color: 'var(--cyan)',       delta: `${pipeline.interview} in interview`,  up: true  },
            { eyebrow: 'Mutual matches', val: loading ? '…' : String(mutualCount),        label: 'Awaiting your review',                                                         glow: 'rgba(34,197,94,0.25)',  color: 'var(--green)',      delta: 'Review now →',      up: true  },
            { eyebrow: 'Offers',         val: loading ? '…' : String(pipeline.offer),     label: 'Awaiting candidate decision',                                                  glow: 'rgba(245,158,11,0.2)',  color: 'var(--amber)',      delta: '5d avg decision',   up: false },
          ].map(s => (
            <div key={s.eyebrow} className="stat-tile" style={{ '--glow': s.glow }}>
              <div className="stat-eyebrow">{s.eyebrow}</div>
              <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
              <div className="stat-label">{s.label}</div>
              <div className={`stat-delta ${s.up ? 'up' : 'warn'}`}>{s.delta}</div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="g2">
          <div>
            {/* Active roles — real */}
            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div className="card-title" style={{ marginBottom: 0 }}>Active roles</div>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('emp-jobs')}>All jobs →</button>
              </div>
              {loading ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>Loading…</div>
              ) : liveJobs.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 10 }}>No active roles yet</div>
                  <button className="btn btn-violet btn-sm" onClick={() => navigate('emp-create-job')}>Post your first role →</button>
                </div>
              ) : liveJobs.slice(0, 5).map(job => (
                <div key={job.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0',
                  borderBottom: '1px solid var(--border)', cursor: 'pointer'
                }} onClick={() => navigate('emp-pipeline')}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{job.title}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <span className="status s-live"><span className="pulse-dot" />live</span>
                      <span className="chip chip-x">{job.function || 'Role'}</span>
                      <span className="chip chip-g">{job.salMin && job.salMax ? `£${job.salMin}k–£${job.salMax}k` : 'Salary TBC'}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#f9a8d4' }}>🧬 DNA active</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pipeline snapshot */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div className="card-title" style={{ marginBottom: 0 }}>Pipeline snapshot</div>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('emp-pipeline')}>Full pipeline →</button>
              </div>
              <div style={{ display: 'flex', gap: 0 }}>
                {[
                  { stage: 'Applied',   count: pipeline.applied,   color: 'var(--text3)' },
                  { stage: 'Shortlist', count: pipeline.shortlist,  color: 'var(--cyan)'  },
                  { stage: 'Interview', count: pipeline.interview,  color: '#a78bfa'      },
                  { stage: 'Final',     count: pipeline.final,      color: 'var(--amber)' },
                  { stage: 'Offer',     count: pipeline.offer,      color: 'var(--green)' },
                ].map((s, i) => (
                  <div key={s.stage} style={{ flex: 1, textAlign: 'center', padding: '10px 6px', borderRight: i < 4 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ fontFamily: 'Manrope', fontSize: 20, fontWeight: 800, color: s.color }}>{s.count}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{s.stage}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div>
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">Action needed</div>
              {mutualCount > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:16 }}>🧬</span>
                  <div style={{ flex:1, fontSize:12, color:'var(--text2)' }}>{mutualCount} new DNA match{mutualCount !== 1 ? 'es' : ''} to review</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('emp-candidates')} style={{ fontSize:11, padding:'4px 10px' }}>Review</button>
                </div>
              )}
              {pipeline.offer > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:16 }}>📋</span>
                  <div style={{ flex:1, fontSize:12, color:'var(--text2)' }}>{pipeline.offer} pending offer response{pipeline.offer !== 1 ? 's' : ''}</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('emp-pipeline')} style={{ fontSize:11, padding:'4px 10px' }}>View</button>
                </div>
              )}
              {mutualCount === 0 && pipeline.offer === 0 && (
                <div style={{ padding:'12px 0', fontSize:12, color:'var(--text3)' }}>Nothing urgent right now ✓</div>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0' }}>
                <span style={{ fontSize:16 }}>⚠️</span>
                <div style={{ flex:1, fontSize:12, color:'var(--text2)' }}>Check ghosting tracker</div>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('emp-ghosting')} style={{ fontSize:11, padding:'4px 10px' }}>View</button>
              </div>
            </div>

            {/* Team DNA health */}
            <div className="card" style={{ border: '1px solid rgba(236,72,153,0.2)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <div className="card-title" style={{ marginBottom:0, color:'#f9a8d4' }}>🧬 Team DNA health</div>
                <button className="btn btn-sm" style={{ background:'rgba(236,72,153,0.1)', border:'1px solid rgba(236,72,153,0.3)', color:'#f9a8d4', fontSize:11 }} onClick={() => navigate('emp-team-dna')}>View →</button>
              </div>
              {[
                { label:'Collaboration', val:72, color:'#a78bfa'       },
                { label:'Data-driven',   val:85, color:'var(--cyan)'   },
                { label:'Async first',   val:68, color:'var(--green)'  },
              ].map(d => (
                <div key={d.label} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7, fontSize:12 }}>
                  <span style={{ color:'var(--text2)', width:100, flexShrink:0 }}>{d.label}</span>
                  <div style={{ flex:1, height:4, background:'rgba(255,255,255,0.08)', borderRadius:2 }}>
                    <div style={{ width:`${d.val}%`, height:'100%', background:d.color, borderRadius:2 }} />
                  </div>
                  <span style={{ color:'var(--text3)', fontSize:11, width:30, textAlign:'right' }}>{d.val}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
