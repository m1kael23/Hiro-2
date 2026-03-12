import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import {
  collection, query, where, orderBy, getDocs, addDoc, serverTimestamp
} from 'firebase/firestore';

/*
  EmpReviews — same UI as original zip
  DB wiring:
    - employer writes reviews of candidates (targetType: 'candidate')
    - employer sees reviews of the company (targetType: 'employer', targetId = profile.id)
    - Hiro Score derived from aggregate of received reviews
*/

function StarRow({ val, setVal }) {
  return (
    <div className="star-row">
      {[1,2,3,4,5].map(n => (
        <span key={n} className={`star${val >= n ? ' filled' : ''}`} onClick={() => setVal(n)}>★</span>
      ))}
    </div>
  );
}

function DimCard({ label, val, setVal }) {
  return (
    <div className="dim-card">
      <div className="dim-label">{label}</div>
      <div className="dim-stars">
        {[1,2,3,4,5].map(n => (
          <span key={n} className={`dim-star${val >= n ? ' filled' : ''}`} onClick={() => setVal(n)}>★</span>
        ))}
      </div>
    </div>
  );
}

function fmtDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function calcHiroScore(reviews) {
  if (!reviews.length) return null;
  const avg = reviews.reduce((s, r) => s + (r.overall || 0), 0) / reviews.length;
  return (avg * 2).toFixed(1); // convert 1-5 stars to /10
}

const SCORE_DIMS = [
  'Interview experience',
  'Culture accuracy',
  'Offer transparency',
  'Time-to-decision',
  'Onboarding quality',
];

export default function EmpReviews() {
  const { showToast } = useApp();
  const { profile }   = useAuth();

  const [activeTab,   setActiveTab]   = useState('pending');
  const [pending,     setPending]     = useState([]);   // candidates to review
  const [submitted,   setSubmitted]   = useState([]);   // reviews employer wrote
  const [received,    setReceived]    = useState([]);   // reviews about company
  const [loading,     setLoading]     = useState(true);

  // Per-candidate review state (keyed by candidate id)
  const [reviewState, setReviewState] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  useEffect(() => {
    if (!profile?.id) { setLoading(false); return; }
    loadAll();
  }, [profile?.id]);

  async function loadAll() {
    setLoading(true);
    try {
      // Reviews already written by this employer
      const writtenQ = query(collection(db, 'reviews'), where('authorId', '==', profile.id), orderBy('createdAt', 'desc'));
      const writtenSnap = await getDocs(writtenQ);
      const writtenList = writtenSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubmitted(writtenList);

      // Reviews about this company
      const recvQ = query(collection(db, 'reviews'), where('targetId', '==', profile.id), where('targetType', '==', 'employer'));
      const recvSnap = await getDocs(recvQ);
      setReceived(recvSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Candidates to potentially review: all candidates not yet reviewed
      const candQ = query(collection(db, 'users'), where('mode', '==', 'candidate'));
      const candSnap = await getDocs(candQ);
      const allCands = candSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const reviewedIds = new Set(writtenList.filter(r => r.targetType === 'candidate').map(r => r.targetId));
      setPending(allCands.filter(c => !reviewedIds.has(c.id)));
    } catch (err) {
      console.error('EmpReviews load error:', err);
    } finally {
      setLoading(false);
    }
  }

  function getRS(id) { return reviewState[id] || { overall:0, prof:0, comm:0, skill:0, dna:0, text:'' }; }
  function setRS(id, field, val) {
    setReviewState(prev => ({ ...prev, [id]: { ...getRS(id), [field]: val } }));
  }

  async function submitReview(candidate) {
    const rs = getRS(candidate.id);
    if (!rs.overall) { showToast('Please add an overall rating first', 'default'); return; }
    setSubmittingId(candidate.id);
    try {
      await addDoc(collection(db, 'reviews'), {
        authorId:    profile.id,
        authorName:  profile.company_name || profile.full_name,
        authorType:  'employer',
        targetId:    candidate.id,
        targetName:  candidate.full_name,
        targetType:  'candidate',
        overall:     rs.overall,
        dims: { Professionalism: rs.prof, Communication: rs.comm, 'Skills accuracy': rs.skill, 'DNA / culture fit': rs.dna },
        wellText:    rs.text,
        anonymous:   false,
        status:      'published',
        createdAt:   serverTimestamp(),
      });
      showToast(`Review submitted — ${candidate.full_name} will be notified when they submit theirs`, 'success');
      await loadAll();
    } catch (err) {
      showToast('Failed to submit review', 'error');
      console.error(err);
    } finally {
      setSubmittingId(null);
    }
  }

  const hiroScore = profile?.hiro_score ?? calcHiroScore(received);
  const totalReviews = received.length;

  // Score bars from received reviews
  const dimAvgs = SCORE_DIMS.map(dim => {
    const vals = received.map(r => r.dims?.[dim]).filter(Boolean);
    if (!vals.length) return { label: dim, val: '—', pct: 0 };
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { label: dim, val: (avg * 2).toFixed(1), pct: Math.round(avg * 20) };
  });

  return (
    <div className="view">
      <div className="scroll">
        <div className="review-shell">
          <div className="page-hdr" style={{ maxWidth: 780, marginBottom: 18 }}>
            <div>
              <div className="eyebrow">Bi-directional · Verified hires only</div>
              <div className="page-title">Reviews</div>
              <div className="page-sub">Rate the candidates you hired. See what they said about you — after both sides submit.</div>
            </div>
          </div>

          {/* Hero */}
          <div className="review-hero" style={{ marginBottom: 18 }}>
            <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:20 }}>
              <div>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.18em', textTransform:'uppercase', color:'rgba(245,158,11,.8)', marginBottom:8 }}>
                  {profile?.company_name || 'Your company'} · Hiro Score™
                </div>
                <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:8 }}>
                  <div className="hiro-score-big" style={{ color:'#fff' }}>{hiroScore || '—'}</div>
                  <div style={{ fontSize:14, color:'rgba(255,255,255,.5)' }}>/ 10 · {totalReviews} verified review{totalReviews !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:14 }}>
                  <span className="company-badge" style={{ background:'rgba(34,197,94,.12)', border:'1px solid rgba(34,197,94,.25)', color:'var(--green)' }}>✓ Verified employer</span>
                  <span className="company-badge" style={{ background:'rgba(56,189,248,.12)', border:'1px solid rgba(56,189,248,.25)', color:'var(--cyan)' }}>{totalReviews} verified review{totalReviews !== 1 ? 's' : ''}</span>
                </div>
                {dimAvgs.some(d => d.pct > 0) && (
                  <div style={{ display:'flex', flexDirection:'column', gap:7, minWidth:280 }}>
                    {dimAvgs.map(({ label, val, pct }) => (
                      <div key={label} className="score-bar-row">
                        <span className="score-bar-lbl">{label}</span>
                        <div className="score-bar-track"><div className="score-bar-fill" style={{ width:`${pct}%` }}></div></div>
                        <span className="score-bar-val">{val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ textAlign:'center', padding:20, borderRadius:'var(--rl)', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)' }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.14em', color:'rgba(255,255,255,.4)', marginBottom:10 }}>What candidates say</div>
                {received.length > 0 && received[0].wellText ? (
                  <>
                    <div style={{ fontSize:14, color:'rgba(255,255,255,.6)', lineHeight:1.8, maxWidth:200, fontStyle:'italic' }}>"{received[0].wellText}"</div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,.3)', marginTop:8 }}>— {received[0].anonymous ? 'Anonymous hire' : received[0].authorName}</div>
                  </>
                ) : (
                  <div style={{ fontSize:13, color:'rgba(255,255,255,.3)', maxWidth:180 }}>Reviews from hires will appear here after both sides submit.</div>
                )}
              </div>
            </div>
          </div>

          {/* Blind banner */}
          <div className="blind-banner" style={{ marginBottom: 16 }}>
            <span style={{ fontSize:20, flexShrink:0 }}>🔒</span>
            <div><strong>Blind reviews</strong> — neither side sees the other's rating until <em>both</em> have submitted. Verified by Hiro against real hire events. Cannot be faked or gamed.</div>
          </div>

          {/* Tabs */}
          <div className="tab-row" style={{ maxWidth:400, marginBottom:16 }}>
            {[
              ['pending',  `⏳ Pending (${pending.length})`],
              ['done',     `✓ Submitted (${submitted.length})`],
              ['received', `📥 Received (${received.length})`],
            ].map(([k, label]) => (
              <div key={k} className={`tab-btn${activeTab===k?' active':''}`} onClick={() => setActiveTab(k)}>{label}</div>
            ))}
          </div>

          {loading && <div style={{ padding:20, color:'var(--text3)', fontSize:13 }}>Loading reviews…</div>}

          {/* Pending — write reviews of candidates */}
          {!loading && activeTab === 'pending' && (
            <div>
              {pending.length === 0 ? (
                <div className="review-card" style={{ textAlign:'center', padding:32 }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>✅</div>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--text2)' }}>No pending reviews</div>
                  <div style={{ fontSize:12, color:'var(--text3)', marginTop:6 }}>Reviews appear here after candidates join from your pipeline.</div>
                </div>
              ) : (
                pending.slice(0, 10).map(cand => {
                  const rs = getRS(cand.id);
                  const isSubmitting = submittingId === cand.id;
                  return (
                    <div key={cand.id} className="review-card pending-review" style={{ marginBottom:12 }}>
                      <div className="rc-hdr">
                        <div className="rc-av" style={{ background:'linear-gradient(135deg,#22c55e,#0d9488)' }}>
                          {(cand.full_name || 'C').split(' ').map(n => n[0]).join('').slice(0,2)}
                        </div>
                        <div style={{ flex:1 }}>
                          <div className="rc-name">{cand.full_name}</div>
                          <div style={{ fontSize:12, color:'var(--text2)' }}>{cand.job_title} · {cand.location}</div>
                        </div>
                        <span className="chip chip-a">Review pending</span>
                      </div>
                      <div style={{ marginBottom:14 }}>
                        <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--text3)', marginBottom:8 }}>Overall candidate rating</div>
                        <StarRow val={rs.overall} setVal={v => setRS(cand.id, 'overall', v)} />
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                        <DimCard label="Professionalism"    val={rs.prof}  setVal={v => setRS(cand.id, 'prof',  v)} />
                        <DimCard label="Communication"      val={rs.comm}  setVal={v => setRS(cand.id, 'comm',  v)} />
                        <DimCard label="Skills accuracy"    val={rs.skill} setVal={v => setRS(cand.id, 'skill', v)} />
                        <DimCard label="DNA / culture fit"  val={rs.dna}   setVal={v => setRS(cand.id, 'dna',   v)} />
                      </div>
                      <div style={{ marginBottom:14 }}>
                        <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--text3)', marginBottom:8 }}>Written feedback (optional)</div>
                        <textarea className="review-textarea" placeholder="Share what made this candidate stand out — or where there were challenges. Blind until they submit theirs."
                          value={rs.text} onChange={e => setRS(cand.id, 'text', e.target.value)} />
                      </div>
                      <button className="btn btn-violet btn-sm" disabled={isSubmitting} onClick={() => submitReview(cand)}>
                        {isSubmitting ? 'Submitting…' : 'Submit review →'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Submitted */}
          {!loading && activeTab === 'done' && (
            <div>
              {submitted.length === 0 ? (
                <div className="review-card" style={{ textAlign:'center', padding:32 }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>📋</div>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--text2)' }}>No submitted reviews yet</div>
                </div>
              ) : (
                submitted.map(r => (
                  <div key={r.id} className="review-card" style={{ borderColor:'rgba(34,197,94,.25)', background:'rgba(34,197,94,.04)', marginBottom:10 }}>
                    <div className="rc-hdr">
                      <div className="rc-av" style={{ background:'linear-gradient(135deg,#0d9488,#0891b2)' }}>
                        {(r.targetName || 'C')[0]}
                      </div>
                      <div style={{ flex:1 }}>
                        <div className="rc-name">{r.targetName}</div>
                        <div style={{ fontSize:12, color:'var(--text2)' }}>Submitted {fmtDate(r.createdAt)}</div>
                      </div>
                      {r.overall > 0 && <div style={{ fontSize:14, color:'var(--amber)' }}>{'★'.repeat(r.overall)}</div>}
                    </div>
                    {r.wellText && (
                      <div style={{ fontSize:14, color:'var(--text2)', lineHeight:1.7, fontStyle:'italic', marginBottom:10 }}>"{r.wellText}"</div>
                    )}
                    {r.dims && (
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {Object.entries(r.dims).filter(([,v]) => v > 0).map(([k, v]) => (
                          <span key={k} className={`chip ${v >= 5 ? 'chip-g' : v >= 4 ? 'chip-c' : 'chip-a'}`}>{k} {'★'.repeat(v)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Received */}
          {!loading && activeTab === 'received' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {received.length === 0 ? (
                <div className="review-card" style={{ textAlign:'center', padding:32 }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>📥</div>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--text2)', marginBottom:6 }}>No reviews yet</div>
                  <div style={{ fontSize:12, color:'var(--text3)' }}>Candidate reviews appear here after both sides submit.</div>
                </div>
              ) : (
                received.map(r => (
                  <div key={r.id} className="review-card">
                    <div className="rc-hdr">
                      <div className="rc-av" style={{ background: r.anonymous ? 'linear-gradient(135deg,#374151,#1f2937)' : 'linear-gradient(135deg,#0d9488,#0891b2)' }}>
                        {r.anonymous ? <span style={{ color:'rgba(255,255,255,.5)', fontSize:12 }}>?</span> : (r.authorName || '?')[0]}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                          <div className="rc-name">{r.anonymous ? 'Anonymous hire' : r.authorName}</div>
                          <span className="verified-badge">✓ Verified</span>
                        </div>
                        <div style={{ fontSize:12, color:'var(--text2)' }}>{fmtDate(r.createdAt)}</div>
                      </div>
                      {r.overall > 0 && <div style={{ color:'var(--amber)', fontSize:14 }}>{'★'.repeat(r.overall)}</div>}
                    </div>
                    {r.wellText && (
                      <div style={{ fontSize:14, color:'var(--text2)', lineHeight:1.7, fontStyle:'italic', marginBottom:10 }}>"{r.wellText}"</div>
                    )}
                    {r.dims && (
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {Object.entries(r.dims).filter(([,v]) => v > 0).map(([k, v]) => (
                          <span key={k} className={`chip ${v >= 5 ? 'chip-g' : v >= 4 ? 'chip-c' : 'chip-a'}`}>{k} {'★'.repeat(v)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
