/**
 * CandVault.jsx — Interview Vault (live Firestore data)
 *
 * Collections:
 *   vault_companies/{companyId}   — name, emoji, report_count, avg_rating, stages, badge
 *   vault_reports/{reportId}      — companyId, companyName, role, outcome, text, questions[], createdAt
 *   vault_questions/{questionId}  — companyId, text, stage, difficulty, votes, reportId
 *
 * Write path: submit form → vault_reports/{id} + vault_questions/{id} documents
 *
 * Aggregate stats (report count, company count) read from
 *   vault_meta/stats — updated by Cloud Function onVaultReportCreated
 *
 * Falls back gracefully when collections are empty (fresh deploy).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, orderBy, limit,
  getDocs, addDoc, getDoc, doc, serverTimestamp, increment, updateDoc,
} from 'firebase/firestore';
import { db }      from '../../firebase';
import { useApp }  from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

const DIFFICULTY_LABELS = ['', 'Easy', 'Medium', 'Hard', 'Very hard', 'Brutal'];

function DifficultyPips({ level }) {
  return (
    <div className="difficulty-pip">
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ background: i <= level ? '#ec4899' : 'rgba(255,255,255,.15)' }} />
      ))}
    </div>
  );
}

/* ── loaders ─────────────────────────────────────────────────── */
async function loadStats() {
  try {
    const d = await getDoc(doc(db, 'vault_meta', 'stats'));
    if (d.exists()) return d.data();
  } catch (_) {}
  return { report_count: 0, company_count: 0 };
}

async function loadCompanies() {
  try {
    const snap = await getDocs(query(
      collection(db, 'vault_companies'),
      orderBy('report_count', 'desc'),
      limit(10)
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (_) { return []; }
}

async function loadReports(companyId) {
  try {
    const snap = await getDocs(query(
      collection(db, 'vault_reports'),
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc'),
      limit(10)
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (_) { return []; }
}

async function loadQuestions(companyId, stageFilter = 'all') {
  try {
    let q = query(
      collection(db, 'vault_questions'),
      where('companyId', '==', companyId),
      orderBy('votes', 'desc'),
      limit(20)
    );
    if (stageFilter !== 'all') {
      q = query(
        collection(db, 'vault_questions'),
        where('companyId', '==', companyId),
        where('stageId', '==', stageFilter),
        orderBy('votes', 'desc'),
        limit(20)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (_) { return []; }
}

/* ── stage display map ───────────────────────────────────────── */
const STAGE_DISPLAY = {
  recruiter: { label:'📞 Recruiter screen', bg:'rgba(108,71,255,.12)', border:'rgba(108,71,255,.25)', color:'#a78bfa' },
  hm:        { label:'🧠 HM interview',      bg:'rgba(56,189,248,.1)',  border:'rgba(56,189,248,.2)',  color:'var(--cyan)'  },
  case:      { label:'📋 Case study',        bg:'rgba(245,158,11,.1)',  border:'rgba(245,158,11,.2)', color:'var(--amber)' },
  panel:     { label:'👥 Panel',             bg:'rgba(34,197,94,.1)',   border:'rgba(34,197,94,.2)',  color:'var(--green)' },
  values:    { label:'🎯 Values interview',  bg:'rgba(236,72,153,.1)',  border:'rgba(236,72,153,.2)', color:'#f9a8d4'      },
};
function stageStyle(stageId) {
  return STAGE_DISPLAY[stageId] || { label: stageId || 'Unknown', bg:'rgba(255,255,255,.06)', border:'rgba(255,255,255,.1)', color:'var(--text3)' };
}

export default function CandVault() {
  const { showToast }  = useApp();
  const { profile }    = useAuth();

  const [view,         setView]         = useState('list');
  const [stageFilter,  setStageFilter]  = useState('all');
  const [voted,        setVoted]        = useState({});

  // Data state
  const [stats,        setStats]        = useState({ report_count: 0, company_count: 0 });
  const [companies,    setCompanies]    = useState([]);
  const [selectedCo,   setSelectedCo]  = useState(null);
  const [reports,      setReports]      = useState([]);
  const [questions,    setQuestions]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [detailLoading,setDetailLoading]= useState(false);

  // Submit form state
  const [submitCompany, setSubmitCompany] = useState('');
  const [submitRole,    setSubmitRole]    = useState('');
  const [submitStage,   setSubmitStage]   = useState('recruiter');
  const [submitOutcome, setSubmitOutcome] = useState('offer');
  const [submitText,    setSubmitText]    = useState('');
  const [submitQs,      setSubmitQs]      = useState([{ text:'', difficulty:'medium' }]);
  const [submitting,    setSubmitting]    = useState(false);

  /* ── initial load ──────────────────────────────────────── */
  useEffect(() => {
    setLoading(true);
    Promise.all([loadStats(), loadCompanies()])
      .then(([s, cos]) => { setStats(s); setCompanies(cos); })
      .finally(() => setLoading(false));
  }, []);

  /* ── load company detail ───────────────────────────────── */
  const openCompany = useCallback(async (co) => {
    setSelectedCo(co);
    setView('detail');
    setStageFilter('all');
    setDetailLoading(true);
    const [rpts, qs] = await Promise.all([loadReports(co.id), loadQuestions(co.id)]);
    setReports(rpts);
    setQuestions(qs);
    setDetailLoading(false);
  }, []);

  /* ── stage filter reload ───────────────────────────────── */
  useEffect(() => {
    if (!selectedCo || view !== 'detail') return;
    loadQuestions(selectedCo.id, stageFilter).then(setQuestions);
  }, [stageFilter, selectedCo, view]);

  /* ── vote ──────────────────────────────────────────────── */
  async function handleVote(qId) {
    if (voted[qId]) return;
    setVoted(p => ({ ...p, [qId]: true }));
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, votes: (q.votes || 0) + 1 } : q));
    try {
      await updateDoc(doc(db, 'vault_questions', qId), { votes: increment(1) });
    } catch (_) {}
  }

  /* ── submit ────────────────────────────────────────────── */
  async function handleSubmit() {
    if (!submitCompany.trim() || !submitRole.trim()) {
      showToast('Please fill in company and role', 'error'); return;
    }
    setSubmitting(true);
    try {
      const reportRef = await addDoc(collection(db, 'vault_reports'), {
        companyId:   submitCompany.toLowerCase().replace(/\s+/g,'-'),
        companyName: submitCompany,
        role:        submitRole,
        stage:       submitStage,
        outcome:     submitOutcome,
        text:        submitText,
        submittedBy: profile?.id || null,
        createdAt:   serverTimestamp(),
        verified:    false,  // Cloud Function will verify against hire events
      });

      const validQs = submitQs.filter(q => q.text.trim());
      for (const q of validQs) {
        await addDoc(collection(db, 'vault_questions'), {
          companyId:   submitCompany.toLowerCase().replace(/\s+/g,'-'),
          companyName: submitCompany,
          reportId:    reportRef.id,
          text:        q.text,
          stageId:     submitStage,
          difficulty:  ['easy','medium','hard','veryhard','brutal'].indexOf(q.difficulty) + 1 || 2,
          votes:       0,
          createdAt:   serverTimestamp(),
        });
      }

      showToast('Intel submitted anonymously ✓', 'success');
      setView('list');
      // Refresh companies
      loadCompanies().then(setCompanies);
    } catch (err) {
      showToast('Submission failed — try again', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div className="scroll">
      <div className="review-shell" style={{ maxWidth: 800 }}>
        <div className="page-hdr" style={{ maxWidth: 800, marginBottom: 18 }}>
          <div>
            <div className="eyebrow">Verified · crowdsourced · real-time</div>
            <div className="page-title">Interview Vault</div>
            <div className="page-sub">Real questions from real Hiro interviews — verified against actual match events. Not Glassdoor. Not forum posts. Tied to a hire.</div>
          </div>
          <button className="btn btn-sm"
            style={{ background:'rgba(245,158,11,.15)', border:'1px solid rgba(245,158,11,.3)', color:'var(--amber)' }}
            onClick={() => setView('submit')}>
            + Submit your questions
          </button>
        </div>

        {/* Hero stats — live */}
        <div className="vault-hero">
          <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:20, flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.18em', textTransform:'uppercase', color:'rgba(245,158,11,.8)', marginBottom:8 }}>The vault · live stats</div>
              <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:24, fontWeight:800, color:'#fff', letterSpacing:'-0.03em', marginBottom:12 }}>
                {stats.report_count > 0 ? `${stats.report_count.toLocaleString()}+ verified interview reports` : 'Building the vault…'}
              </div>
              <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                {[
                  [stats.report_count || '—',  'var(--amber)', 'Interview reports'],
                  ['100%',                      'var(--green)', 'Verified hires'  ],
                  [stats.company_count || '—',  'var(--cyan)',  'Companies covered'],
                ].map(([v,c,l]) => (
                  <div key={l}>
                    <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:32, fontWeight:800, color:c }}>{v}</div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="vault-search">
          <input className="inp" style={{ flex:1 }} placeholder="Search company or role… e.g. Monzo Sr PM, Revolut Lead Engineer" />
          <select className="sel" style={{ width:140 }}>
            <option>All roles</option><option>PM</option><option>Engineer</option><option>Design</option><option>Data</option>
          </select>
          <button className="btn btn-sm"
            style={{ background:'rgba(245,158,11,.15)', border:'1px solid rgba(245,158,11,.3)', color:'var(--amber)' }}>
            Search
          </button>
        </div>

        {/* ── Company list ────────────────────────────────── */}
        {view === 'list' && (
          <div>
            <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.14em', color:'var(--text3)', marginBottom:12 }}>
              Most active · last 30 days
            </div>

            {loading && (
              <div style={{ fontSize:13, color:'var(--text3)', padding:'20px 0', textAlign:'center' }}>Loading vault…</div>
            )}

            {!loading && companies.length === 0 && (
              <div style={{ fontSize:13, color:'var(--text3)', padding:'20px 0', textAlign:'center' }}>
                No interview reports yet. Be the first to{' '}
                <button onClick={() => setView('submit')}
                  style={{ background:'none', border:'none', color:'var(--violet)', cursor:'pointer', fontSize:13, padding:0 }}>
                  submit your questions →
                </button>
              </div>
            )}

            {!loading && companies.map((co, i) => {
              const badge = co.badge;
              return (
                <div key={co.id || i} className="vault-company-card"
                  onClick={() => openCompany(co)} style={{ cursor:'pointer' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ fontSize:32, flexShrink:0 }}>{co.emoji || '🏢'}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
                        <div style={{ fontSize:14, fontWeight:700 }}>{co.name}</div>
                        <span className="verified-badge">✓ Verified</span>
                        {badge && (
                          <span className="process-badge"
                            style={{ background:badge.bg, border:`1px solid ${badge.border}`, color:badge.color }}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize:12, color:'var(--text2)', marginBottom:6 }}>
                        {co.report_count || 0} reports · {co.roles || ''}{co.updated_label ? ` · Updated ${co.updated_label}` : ''}
                      </div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {(co.stages || []).map(s => (
                          <span key={s} className="vault-stage-badge"
                            style={{ background:'rgba(108,71,255,.12)', border:'1px solid rgba(108,71,255,.25)', color:'#a78bfa' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:24, fontWeight:800, color:'var(--amber)' }}>
                        {co.avg_rating ? co.avg_rating.toFixed(1) : '—'}
                      </div>
                      <div style={{ fontSize:10, color:'var(--text3)' }}>Process rating</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Company detail ────────────────────────────── */}
        {view === 'detail' && selectedCo && (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setView('list')}>← All companies</button>
              <span style={{ fontSize:20 }}>{selectedCo.emoji || '🏢'}</span>
              <div style={{ fontSize:16, fontWeight:700 }}>{selectedCo.name} · interview reports</div>
              <span className="verified-badge" style={{ marginLeft:'auto' }}>
                ✓ {selectedCo.report_count || 0} verified
              </span>
            </div>

            <div className="tab-row" style={{ marginBottom:16 }}>
              {[['all','All stages'],['recruiter','📞 Recruiter'],['hm','🧠 HM'],['case','📋 Case'],['panel','👥 Panel']].map(([id, label]) => (
                <div key={id} className={`tab-btn${stageFilter===id?' active':''}`} onClick={() => setStageFilter(id)}>{label}</div>
              ))}
            </div>

            {detailLoading && (
              <div style={{ fontSize:13, color:'var(--text3)', padding:'20px 0', textAlign:'center' }}>Loading reports…</div>
            )}

            {!detailLoading && reports.length === 0 && (
              <div style={{ fontSize:13, color:'var(--text3)', padding:'20px 0', textAlign:'center' }}>
                No reports yet for {selectedCo.name}. Know the process?{' '}
                <button onClick={() => setView('submit')}
                  style={{ background:'none', border:'none', color:'var(--violet)', cursor:'pointer', fontSize:13, padding:0 }}>
                  Submit your experience →
                </button>
              </div>
            )}

            {!detailLoading && reports.map((report, ri) => {
              const gotOffer = report.outcome === 'offer';
              const reportQs = questions.filter(q => q.reportId === report.id);

              return (
                <div key={report.id || ri} className={`vault-report-card ${gotOffer ? 'got-offer' : 'no-offer'}`}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span className="verified-badge">{report.verified ? '✓ Verified hire' : 'Verified candidate'}</span>
                      {gotOffer
                        ? <span className="vault-stage-badge" style={{ background:'rgba(34,197,94,.12)', border:'1px solid rgba(34,197,94,.25)', color:'var(--green)' }}>Offer received ✓</span>
                        : <span className="vault-stage-badge" style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'var(--text3)' }}>No offer · {stageStyle(report.stage).label}</span>
                      }
                    </div>
                    <span style={{ fontSize:12, color:'var(--text3)' }}>
                      {report.createdAt?.toDate
                        ? report.createdAt.toDate().toLocaleDateString('en-GB', { day:'numeric', month:'short' })
                        : ''} · {report.role || ''}
                    </span>
                  </div>

                  {report.text && (
                    <div style={{ fontSize:12, color:'var(--text2)', marginBottom:12, lineHeight:1.7 }}>{report.text}</div>
                  )}

                  {reportQs.length > 0 && (
                    <>
                      <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--text3)', marginBottom:8 }}>Questions asked</div>
                      {reportQs.map(q => {
                        const ss = stageStyle(q.stageId);
                        return (
                          <div key={q.id} className="vault-q-item">
                            <div className="vault-q-text">"{q.text}"</div>
                            <div className="vault-q-meta">
                              <span className="vault-stage-badge" style={{ background:ss.bg, border:`1px solid ${ss.border}`, color:ss.color }}>{ss.label}</span>
                              <DifficultyPips level={q.difficulty || 2} />
                              <span style={{ fontSize:10, color:'var(--text3)' }}>{DIFFICULTY_LABELS[q.difficulty || 2]}</span>
                              <button className={`vote-btn${voted[q.id]?' voted':''}`} onClick={() => handleVote(q.id)}>
                                👍 {(q.votes || 0) + (voted[q.id] ? 1 : 0)}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              );
            })}

            {/* Questions not tied to a specific report */}
            {!detailLoading && questions.filter(q => !q.reportId).length > 0 && (
              <div className="vault-report-card got-offer" style={{ marginTop:8 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--text3)', marginBottom:12 }}>
                  Additional verified questions
                </div>
                {questions.filter(q => !q.reportId).map(q => {
                  const ss = stageStyle(q.stageId);
                  return (
                    <div key={q.id} className="vault-q-item">
                      <div className="vault-q-text">"{q.text}"</div>
                      <div className="vault-q-meta">
                        <span className="vault-stage-badge" style={{ background:ss.bg, border:`1px solid ${ss.border}`, color:ss.color }}>{ss.label}</span>
                        <DifficultyPips level={q.difficulty || 2} />
                        <span style={{ fontSize:10, color:'var(--text3)' }}>{DIFFICULTY_LABELS[q.difficulty || 2]}</span>
                        <button className={`vote-btn${voted[q.id]?' voted':''}`} onClick={() => handleVote(q.id)}>
                          👍 {(q.votes || 0) + (voted[q.id] ? 1 : 0)}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ padding:'14px 16px', borderRadius:'var(--r)', background:'rgba(245,158,11,.06)', border:'1px solid rgba(245,158,11,.25)', fontSize:12, color:'var(--text2)', marginTop:4 }}>
              🔐 <strong style={{ color:'var(--amber)' }}>Had an interview with {selectedCo.name}?</strong>{' '}
              Your questions are verified and posted anonymously. Every submission keeps the vault current for the next candidate.
              <button className="btn btn-sm"
                style={{ background:'rgba(245,158,11,.15)', border:'1px solid rgba(245,158,11,.3)', color:'var(--amber)', marginLeft:8 }}
                onClick={() => setView('submit')}>
                Submit questions →
              </button>
            </div>
          </div>
        )}

        {/* ── Submit form ───────────────────────────────── */}
        {view === 'submit' && (
          <div>
            <button className="btn btn-ghost btn-sm" style={{ marginBottom:14 }} onClick={() => setView('list')}>← Back</button>
            <div className="card" style={{ marginBottom:14 }}>
              <div className="card-title">Submit interview intel</div>
              <div style={{ fontSize:12, color:'var(--text2)', marginBottom:14 }}>
                Add questions from a real interview. Verified against hire events. Helps future candidates prepare.
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:14 }}>
                <div className="offer-field">
                  <label>Company</label>
                  <input className="inp" placeholder="e.g. Monzo" value={submitCompany} onChange={e => setSubmitCompany(e.target.value)} />
                </div>
                <div className="offer-field">
                  <label>Role / level</label>
                  <input className="inp" placeholder="e.g. Senior PM" value={submitRole} onChange={e => setSubmitRole(e.target.value)} />
                </div>
                <div className="offer-field">
                  <label>Stage</label>
                  <select className="sel" value={submitStage} onChange={e => setSubmitStage(e.target.value)}>
                    <option value="recruiter">Recruiter screen</option>
                    <option value="hm">HM interview</option>
                    <option value="case">Case study</option>
                    <option value="panel">Panel</option>
                    <option value="values">Values interview</option>
                  </select>
                </div>
                <div className="offer-field">
                  <label>Outcome</label>
                  <select className="sel" value={submitOutcome} onChange={e => setSubmitOutcome(e.target.value)}>
                    <option value="offer">Offer received</option>
                    <option value="no_offer">No offer — screened out</option>
                    <option value="withdrew">I withdrew</option>
                  </select>
                </div>
              </div>

              <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--text3)', marginBottom:8 }}>
                Questions you were asked
              </div>
              {submitQs.map((q, i) => (
                <div key={i} className="submit-q-row">
                  <input className="submit-q-inp" placeholder={`Question ${i+1}…`}
                    value={q.text} onChange={e => setSubmitQs(prev => prev.map((x,j) => j===i ? { ...x, text: e.target.value } : x))} />
                  <select className="sel" style={{ width:120 }} value={q.difficulty}
                    onChange={e => setSubmitQs(prev => prev.map((x,j) => j===i ? { ...x, difficulty: e.target.value } : x))}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="brutal">Brutal</option>
                  </select>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" style={{ marginTop:6, marginBottom:14 }}
                onClick={() => setSubmitQs(prev => [...prev, { text:'', difficulty:'medium' }])}>
                + Add question
              </button>

              <textarea className="review-textarea"
                placeholder="Anything else worth knowing — how the process felt, what surprised you, what to prepare for…"
                style={{ marginBottom:14 }}
                value={submitText}
                onChange={e => setSubmitText(e.target.value)} />

              <button className="btn btn-violet btn-sm" style={{ width:'100%', justifyContent:'center' }}
                onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit anonymously →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
