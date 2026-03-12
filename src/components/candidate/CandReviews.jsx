import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import {
  collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, updateDoc, doc
} from 'firebase/firestore';

/*
  CandReviews — same UI as original zip
  DB wiring:
    - reviews collection: { authorId, authorType, targetId, targetType, overall, dims, wellText, improveText, anonymous, createdAt, status }
    - Candidate writes reviews about employers (targetType: 'employer')
    - Candidate sees reviews written about them (targetType: 'candidate')
    - Blind: employer review only revealed once candidate also submits (status: 'pending' → 'revealed')
*/

const DIMS = [
  'Overall experience',
  'Interview process',
  'Culture accuracy',
  'Offer transparency',
  'Onboarding quality',
  'Did the role match what was advertised?',
];

function calcAvg(reviews) {
  if (!reviews.length) return null;
  const sum = reviews.reduce((s, r) => s + (r.overall || 0), 0);
  return (sum / reviews.length).toFixed(1);
}

function fmtDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export default function CandReviews() {
  const { showToast } = useApp();
  const { profile }   = useAuth();

  const [tab,          setTab]          = useState('write');
  const [toWrite,      setToWrite]      = useState([]);   // employers candidate has pending reviews for
  const [submitted,    setSubmitted]    = useState([]);   // reviews candidate wrote
  const [received,     setReceived]     = useState([]);   // reviews written about candidate
  const [loading,      setLoading]      = useState(true);

  // Write-review local state (per employer being reviewed)
  const [activeWrite,  setActiveWrite]  = useState(null); // employer object
  const [stars,        setStars]        = useState({});
  const [wellText,     setWellText]     = useState('');
  const [improveText,  setImproveText]  = useState('');
  const [anonymous,    setAnonymous]    = useState(true);
  const [submitting,   setSubmitting]   = useState(false);

  // Count stats
  const [reliabilityScore] = useState(profile?.reliability_score || 91);

  useEffect(() => {
    if (!profile?.id) { setLoading(false); return; }
    loadAll();
  }, [profile?.id]);

  async function loadAll() {
    setLoading(true);
    try {
      // Reviews written by this candidate
      const writtenQ = query(collection(db, 'reviews'), where('authorId', '==', profile.id), orderBy('createdAt', 'desc'));
      const writtenSnap = await getDocs(writtenQ);
      const writtenList = writtenSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubmitted(writtenList);

      // Reviews about this candidate (from employers)
      const recvQ = query(collection(db, 'reviews'), where('targetId', '==', profile.id), where('targetType', '==', 'candidate'));
      const recvSnap = await getDocs(recvQ);
      const recvList = recvSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReceived(recvList);

      // Employers this candidate hired at (from users collection, mode: employer)
      // For simplicity: show all employers they haven't reviewed yet
      const empQ = query(collection(db, 'users'), where('mode', '==', 'employer'));
      const empSnap = await getDocs(empQ);
      const allEmps = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const reviewedIds = new Set(writtenList.filter(r => r.targetType === 'employer').map(r => r.targetId));
      setToWrite(allEmps.filter(e => !reviewedIds.has(e.id)));
    } catch (err) {
      console.error('CandReviews load error:', err);
    } finally {
      setLoading(false);
    }
  }

  function openWrite(employer) {
    setActiveWrite(employer);
    setStars({});
    setWellText('');
    setImproveText('');
    setAnonymous(true);
  }

  const allRated = DIMS.every(d => stars[d]);

  async function handleSubmit() {
    if (!allRated || !activeWrite || !profile) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        authorId:    profile.id,
        authorName:  anonymous ? null : profile.full_name,
        authorType:  'candidate',
        targetId:    activeWrite.id,
        targetName:  activeWrite.company_name || activeWrite.full_name,
        targetType:  'employer',
        overall:     stars['Overall experience'] || 0,
        dims:        stars,
        wellText,
        improveText,
        anonymous,
        status:      'published',
        createdAt:   serverTimestamp(),
      });
      showToast(`Review submitted · ${activeWrite.company_name || 'Company'}'s review of you is now unlocked`, 'success');
      setActiveWrite(null);
      setTab('submitted');
      await loadAll();
    } catch (err) {
      showToast('Failed to submit review', 'error');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  const avgRating = calcAvg(received);

  return (
    <div className="view">
      <div className="scroll">
        <div style={{ maxWidth: 780, margin: '0 auto' }}>

          <div className="page-hdr" style={{ marginBottom: 22 }}>
            <div>
              <div className="eyebrow">Verified hires only · Blind until both submit</div>
              <div className="page-title">Reviews</div>
              <div className="page-sub">Rate the companies you joined. See what they said about you — after both sides submit.</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { val: toWrite.length,   label: 'Awaiting review',    sub: 'Companies to rate',            color: 'var(--amber)' },
              { val: submitted.length, label: 'Submitted',          sub: 'Reviews you\'ve written',      color: 'var(--text2)' },
              { val: received.length,  label: 'Reviews about you',  sub: avgRating ? `Avg ${avgRating}★` : 'Submit yours to unlock', color: 'var(--text2)' },
            ].map(({ val, label, sub, color }) => (
              <div key={label} className="card" style={{ textAlign: 'center', padding: 16 }}>
                <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 32, fontWeight: 800, color, marginBottom: 4 }}>{val}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{label}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Reliability nudge */}
          <div style={{ background: 'linear-gradient(135deg,rgba(108,71,255,.12),rgba(56,189,248,.08))', border: '1px solid rgba(108,71,255,.25)', borderRadius: 'var(--r)', padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 32 }}>⭐</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Your reliability score is <span style={{ color: 'var(--violet)' }}>{reliabilityScore} / 100</span></div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Submitting reviews adds up to <strong style={{ color: 'var(--green)' }}>+9 pts</strong> and unlocks employer reviews of you.</div>
            </div>
            {toWrite.length > 0 && (
              <button style={{ padding:'7px 16px', borderRadius:'var(--r)', background:'var(--violet)', border:'none', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }} onClick={() => setTab('write')}>
                Write review →
              </button>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:4, marginBottom:18, background:'rgba(255,255,255,.04)', borderRadius:10, padding:4, maxWidth:380 }}>
            {[
              { id:'write',     label:`⏳ To write (${toWrite.length})` },
              { id:'submitted', label:'✓ Submitted' },
              { id:'received',  label:'📥 About you' },
            ].map(t => (
              <button key={t.id}
                style={{ flex:1, padding:'7px 10px', borderRadius:7, border:'none', fontSize:12, fontWeight:600, cursor:'pointer', background:tab===t.id?'rgba(108,71,255,.8)':'transparent', color:tab===t.id?'#fff':'var(--text2)' }}
                onClick={() => { setTab(t.id); if (t.id !== 'write') setActiveWrite(null); }}>{t.label}
              </button>
            ))}
          </div>

          {loading && <div style={{ padding:20, color:'var(--text3)', fontSize:13 }}>Loading reviews…</div>}

          {/* To write */}
          {!loading && tab === 'write' && (
            <div>
              {/* Active review form */}
              {activeWrite ? (
                <div className="card" style={{ marginBottom: 14 }}>
                  {/* Header */}
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18, paddingBottom:14, borderBottom:'1px solid var(--border2)' }}>
                    <div style={{ width:42, height:42, borderRadius:12, background:'linear-gradient(135deg,#6c47ff,#8b6bff)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'#fff', fontFamily:'Manrope,sans-serif', flexShrink:0 }}>
                      {(activeWrite.company_name || activeWrite.full_name || 'C')[0]}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{activeWrite.company_name || activeWrite.full_name}</div>
                      <div style={{ fontSize:12, color:'var(--text2)' }}>{activeWrite.industry} · {activeWrite.stage}</div>
                    </div>
                    <button style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:13 }} onClick={() => setActiveWrite(null)}>✕ Cancel</button>
                  </div>

                  <div style={{ fontSize:12, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:14 }}>Rate your experience</div>

                  {DIMS.map(dim => (
                    <div key={dim} className="rev-dim-row" style={dim===DIMS[DIMS.length-1]?{borderBottom:'none'}:{}}>
                      <div className="rev-dim-label">{dim}</div>
                      <div className="rev-stars">
                        {[1,2,3,4,5].map(v => (
                          <span key={v} className="rev-star" style={{ color: stars[dim]>=v?'var(--amber)':'rgba(255,255,255,.2)', cursor:'pointer', fontSize:20 }}
                            onClick={() => setStars(p => ({ ...p, [dim]: v }))}>★</span>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop:18, paddingTop:16, borderTop:'1px solid var(--border2)' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)', marginBottom:6 }}>What went well</div>
                        <textarea placeholder="Fast process, transparent comp…" value={wellText} onChange={e => setWellText(e.target.value)}
                          style={{ width:'100%', height:72, background:'rgba(255,255,255,.04)', border:'1px solid var(--border2)', borderRadius:'var(--r)', color:'#fff', fontSize:12, padding:9, resize:'none', lineHeight:1.5, boxSizing:'border-box' }} />
                      </div>
                      <div>
                        <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)', marginBottom:6 }}>What could improve</div>
                        <textarea placeholder="Case study prep info was thin…" value={improveText} onChange={e => setImproveText(e.target.value)}
                          style={{ width:'100%', height:72, background:'rgba(255,255,255,.04)', border:'1px solid var(--border2)', borderRadius:'var(--r)', color:'#fff', fontSize:12, padding:9, resize:'none', lineHeight:1.5, boxSizing:'border-box' }} />
                      </div>
                    </div>

                    <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'10px 12px', borderRadius:'var(--r)', background:'rgba(255,255,255,.03)', border:'1px solid var(--border2)', marginBottom:14 }}>
                      <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} style={{ accentColor:'var(--violet)', width:15, height:15 }} />
                      <div>
                        <div style={{ fontSize:12, fontWeight:600, color:'#fff' }}>Post anonymously on {activeWrite.company_name || 'their'} public profile</div>
                        <div style={{ fontSize:12, color:'var(--text3)' }}>Hiro verifies it's a real hire — but your name stays hidden</div>
                      </div>
                    </label>

                    <div style={{ padding:'10px 14px', borderRadius:'var(--r)', background:'rgba(56,189,248,.07)', border:'1px solid rgba(56,189,248,.2)', marginBottom:16, fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>
                      <strong style={{ color:'#38bdf8' }}>After you submit</strong> — if they have also reviewed you, you'll immediately see their rating and written feedback.
                    </div>

                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ fontSize:12, color:'var(--text3)' }}>{allRated ? 'Ready to submit' : 'All fields required to submit'}</div>
                      <button onClick={handleSubmit} disabled={!allRated || submitting}
                        style={{ padding:'9px 22px', borderRadius:'var(--r)', background:'var(--violet)', border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:allRated&&!submitting?'pointer':'not-allowed', opacity:allRated&&!submitting?1:.4 }}>
                        {submitting ? 'Submitting…' : 'Submit review'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : toWrite.length === 0 ? (
                <div className="card" style={{ textAlign:'center', padding:32, color:'var(--text3)' }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>✅</div>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--text2)' }}>All reviews submitted</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {toWrite.map(emp => (
                    <div key={emp.id} className="card" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', cursor:'pointer' }}
                      onClick={() => openWrite(emp)}>
                      <div>
                        <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{emp.company_name || emp.full_name}</div>
                        <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{emp.industry} · {emp.stage} · {emp.location}</div>
                      </div>
                      <button style={{ padding:'7px 16px', borderRadius:8, border:'1px solid var(--violet)', background:'rgba(108,71,255,.1)', color:'var(--violet)', cursor:'pointer', fontSize:12, fontWeight:700 }}>
                        Write review →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submitted */}
          {!loading && tab === 'submitted' && (
            <div>
              {submitted.length === 0 ? (
                <div className="card" style={{ textAlign:'center', padding:32, color:'var(--text3)' }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>📝</div>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--text2)', marginBottom:6 }}>No reviews submitted yet</div>
                  <div style={{ fontSize:12 }}>Switch to "To write" to submit your first review.</div>
                </div>
              ) : (
                submitted.map(r => (
                  <div key={r.id} className="card" style={{ marginBottom:10 }}>
                    <div className="rc-hdr">
                      <div className="rc-av" style={{ background:'linear-gradient(135deg,#6c47ff,#8b6bff)' }}>
                        {(r.targetName || 'C')[0]}
                      </div>
                      <div style={{ flex:1 }}>
                        <div className="rc-name">{r.targetName}</div>
                        <div style={{ fontSize:12, color:'var(--text2)' }}>Submitted {fmtDate(r.createdAt)}</div>
                      </div>
                      <span className="chip chip-g">Submitted ✓</span>
                    </div>
                    {r.overall > 0 && (
                      <div style={{ color:'var(--amber)', fontSize:16, marginBottom:6 }}>
                        {'★'.repeat(r.overall)}{'☆'.repeat(5 - r.overall)}
                      </div>
                    )}
                    {r.wellText && <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6, fontStyle:'italic' }}>"{r.wellText}"</div>}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Received */}
          {!loading && tab === 'received' && (
            <div className="card" style={{ padding: 24 }}>
              {received.length === 0 ? (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                    <div style={{ width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span className="ico ico-lock" style={{ width:28, height:28, background:'var(--text3)' }} />
                    </div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:3 }}>Employer reviews of you are locked</div>
                      <div style={{ fontSize:12, color:'var(--text2)' }}>Submit your review of a company first — if they've reviewed you too, their feedback unlocks immediately.</div>
                    </div>
                  </div>
                  {toWrite.length > 0 && (
                    <button style={{ padding:'9px 20px', borderRadius:'var(--r)', background:'var(--violet)', border:'none', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}
                      onClick={() => setTab('write')}>Write a review to unlock →</button>
                  )}
                </>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {received.map(r => (
                    <div key={r.id}>
                      <div className="rc-hdr">
                        <div className="rc-av" style={{ background:'linear-gradient(135deg,#22c55e,#0d9488)' }}>
                          {r.anonymous ? '?' : (r.authorName || '?')[0]}
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
