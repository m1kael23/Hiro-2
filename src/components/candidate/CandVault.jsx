import { useState } from 'react';
import { useApp } from '../../context/AppContext';

const COMPANIES = [
  { emoji: '🏦', name: 'Monzo', reports: 14, roles: 'Sr PM, Lead Eng, Data Analyst', updated: '3 days ago', rating: 4.4, badge: { label: 'Transparent process', color: 'var(--green)', bg: 'rgba(34,197,94,.12)', border: 'rgba(34,197,94,.25)' }, stages: ['📞 Recruiter screen', '🧠 HM interview', '📋 Case study', '👥 Panel'] },
  { emoji: '💳', name: 'Revolut', reports: 22, roles: 'Sr PM, Eng, Design', updated: '1 day ago', rating: 3.8, badge: null, stages: ['📞 Recruiter screen', '📋 Take-home task', '🧠 3× interviews'] },
  { emoji: '🌐', name: 'Wise', reports: 11, roles: 'Principal PM, Eng Lead', updated: '5 days ago', rating: 4.7, badge: { label: 'Transparent process', color: 'var(--green)', bg: 'rgba(34,197,94,.12)', border: 'rgba(34,197,94,.25)' }, stages: ['📞 Recruiter screen', '🧠 HM interview', '🎯 Values interview'] },
];

export default function CandVault() {
  const { showToast } = useApp();
  const [view, setView] = useState('list'); // list | monzo | submit
  const [stageFilter, setStageFilter] = useState('all');
  const [voted, setVoted] = useState({});

  const MONZO_QUESTIONS = [
    { text: '"Walk me through a time you made a significant product decision with incomplete data. What was the decision, what did you know, and what would you do differently?"', stage: '🧠 HM interview', stageBg: 'rgba(56,189,248,.1)', stageBorder: 'rgba(56,189,248,.2)', stageColor: 'var(--cyan)', difficulty: 3, votes: 47, id: 'q1' },
    { text: '"Monzo is considering expanding into business lending. How would you approach defining the MVP, and what\'s the first metric you\'d optimise for?"', stage: '📋 Case study', stageBg: 'rgba(245,158,11,.1)', stageBorder: 'rgba(245,158,11,.2)', stageColor: 'var(--amber)', difficulty: 4, votes: 35, id: 'q2' },
    { text: '"Tell me about a product you admire that isn\'t in fintech. What would you steal from it and why?"', stage: '📞 Recruiter screen', stageBg: 'rgba(108,71,255,.12)', stageBorder: 'rgba(108,71,255,.25)', stageColor: '#a78bfa', difficulty: 2, votes: 28, id: 'q3' },
    { text: '"You have 6 months to double the activation rate of Monzo Business. Walk us through your full diagnostic, prioritisation framework, and first 30 days."', stage: '📋 Case study', stageBg: 'rgba(245,158,11,.1)', stageBorder: 'rgba(245,158,11,.2)', stageColor: 'var(--amber)', difficulty: 5, votes: 51, id: 'q4', noOffer: true },
  ];

  const DIFFICULTY_LABELS = ['', 'Easy', 'Medium', 'Hard', 'Very hard', 'Brutal'];

  const handleVote = (id) => setVoted(p => ({ ...p, [id]: true }));

  return (
    <div className="scroll">
      <div className="review-shell" style={{ maxWidth: 800 }}>
        <div className="page-hdr" style={{ maxWidth: 800, marginBottom: 18 }}>
          <div>
            <div className="eyebrow">Verified · crowdsourced · real-time</div>
            <div className="page-title">Interview Vault</div>
            <div className="page-sub">Real questions from real Hiro interviews — verified against actual match events. Not Glassdoor. Not forum posts. Tied to a hire.</div>
          </div>
          <button className="btn btn-sm" style={{ background: 'rgba(245,158,11,.15)', border: '1px solid rgba(245,158,11,.3)', color: 'var(--amber)' }} onClick={() => setView('submit')}>+ Submit your questions</button>
        </div>

        {/* Hero stats */}
        <div className="vault-hero">
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(245,158,11,.8)', marginBottom: 8 }}>The vault · live stats</div>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 12 }}>4,200+ verified interview reports</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[['4,247', 'var(--amber)', 'Interview reports'], ['100%', 'var(--green)', 'Verified hires'], ['218', 'var(--cyan)', 'Companies covered'], ['8.2d', '#a78bfa', 'Avg freshness']].map(([v, c, l]) => (
                  <div key={l}><div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 32, fontWeight: 800, color: c }}>{v}</div><div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{l}</div></div>
                ))}
              </div>
            </div>
            <div style={{ padding: '14px 18px', borderRadius: 'var(--rl)', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', fontSize: 12, textAlign: 'center', flexShrink: 0 }}>
              <div style={{ color: 'rgba(255,255,255,.4)', marginBottom: 4 }}>You have an interview with</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Monzo</div>
              <button className="btn btn-sm" style={{ background: 'rgba(245,158,11,.2)', border: '1px solid rgba(245,158,11,.35)', color: 'var(--amber)' }} onClick={() => setView('monzo')}>View 14 reports →</button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="vault-search">
          <input className="inp" style={{ flex: 1 }} placeholder="Search company or role… e.g. Monzo Sr PM, Revolut Lead Engineer" />
          <select className="sel" style={{ width: 140 }}><option>All roles</option><option>PM</option><option>Engineer</option><option>Design</option><option>Data</option></select>
          <button className="btn btn-sm" style={{ background: 'rgba(245,158,11,.15)', border: '1px solid rgba(245,158,11,.3)', color: 'var(--amber)' }} onClick={() => setView('monzo')}>Search</button>
        </div>

        {/* Company list */}
        {view === 'list' && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--text3)', marginBottom: 12 }}>Most active · last 30 days</div>
            {COMPANIES.map((co, i) => (
              <div key={i} className="vault-company-card" onClick={() => co.name === 'Monzo' && setView('monzo')} style={{ cursor: co.name === 'Monzo' ? 'pointer' : 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 32, flexShrink: 0 }}>{co.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{co.name}</div>
                      <span className="verified-badge">✓ Verified</span>
                      {co.badge && <span className="process-badge" style={{ background: co.badge.bg, border: `1px solid ${co.badge.border}`, color: co.badge.color }}>{co.badge.label}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>{co.reports} reports · {co.roles} · Updated {co.updated}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {co.stages.map(s => <span key={s} className="vault-stage-badge" style={{ background: 'rgba(108,71,255,.12)', border: '1px solid rgba(108,71,255,.25)', color: '#a78bfa' }}>{s}</span>)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--amber)' }}>{co.rating}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>Process rating</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Monzo detail */}
        {view === 'monzo' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setView('list')}>← All companies</button>
              <span style={{ fontSize: 20 }}>🏦</span>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Monzo · Sr PM interview reports</div>
              <span className="verified-badge" style={{ marginLeft: 'auto' }}>✓ 14 verified</span>
            </div>

            <div className="tab-row" style={{ marginBottom: 16 }}>
              {[['all', 'All stages'], ['recruiter', '📞 Recruiter'], ['hm', '🧠 HM interview'], ['case', '📋 Case study'], ['panel', '👥 Panel']].map(([id, label]) => (
                <div key={id} className={`tab-btn${stageFilter === id ? ' active' : ''}`} onClick={() => setStageFilter(id)}>{label}</div>
              ))}
            </div>

            {/* Report 1 */}
            <div className="vault-report-card got-offer">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="verified-badge">✓ Verified hire</span>
                  <span className="vault-stage-badge" style={{ background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.25)', color: 'var(--green)' }}>Offer received ✓</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>14 days ago · Sr PM</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.7 }}>Fast, well-organised process. 4 stages over 3 weeks. Every interviewer was well-briefed. Case study was hard but fair — they gave me the context I needed.</div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text3)', marginBottom: 8 }}>Questions asked</div>
              {MONZO_QUESTIONS.filter(q => !q.noOffer).map(q => (
                <div key={q.id} className="vault-q-item">
                  <div className="vault-q-text">{q.text}</div>
                  <div className="vault-q-meta">
                    <span className="vault-stage-badge" style={{ background: q.stageBg, border: `1px solid ${q.stageBorder}`, color: q.stageColor }}>{q.stage}</span>
                    <div className="difficulty-pip">
                      {[1, 2, 3, 4, 5].map(i => <span key={i} style={{ background: i <= q.difficulty ? '#ec4899' : 'rgba(255,255,255,.15)' }} />)}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>{DIFFICULTY_LABELS[q.difficulty]}</span>
                    <button className={`vote-btn${voted[q.id] ? ' voted' : ''}`} onClick={() => handleVote(q.id)}>👍 {voted[q.id] ? q.votes + 1 : q.votes}</button>
                    <button className="vote-btn">🚩 Flag</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Report 2 */}
            <div className="vault-report-card no-offer">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="verified-badge">✓ Verified candidate</span>
                  <span className="vault-stage-badge" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: 'var(--text3)' }}>No offer · Round 2</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>1 month ago · Sr PM</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.7 }}>Process felt thorough. Got to HM round. Case study was tougher than expected — I wasn&apos;t prepared for the level of quantitative rigour they expected in the metrics section.</div>
              {MONZO_QUESTIONS.filter(q => q.noOffer).map(q => (
                <div key={q.id} className="vault-q-item">
                  <div className="vault-q-text">{q.text}</div>
                  <div className="vault-q-meta">
                    <span className="vault-stage-badge" style={{ background: q.stageBg, border: `1px solid ${q.stageBorder}`, color: q.stageColor }}>{q.stage}</span>
                    <div className="difficulty-pip">
                      {[1, 2, 3, 4, 5].map(i => <span key={i} style={{ background: '#ec4899' }} />)}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>Brutal</span>
                    <button className={`vote-btn${voted[q.id] ? ' voted' : ''}`} onClick={() => handleVote(q.id)}>👍 {voted[q.id] ? q.votes + 1 : q.votes}</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '14px 16px', borderRadius: 'var(--r)', background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.25)', fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
              🔐 <strong style={{ color: 'var(--amber)' }}>Had an interview with Monzo?</strong> Your questions are verified and posted anonymously. Every submission keeps the vault current for the next candidate.
              <button className="btn btn-sm" style={{ background: 'rgba(245,158,11,.15)', border: '1px solid rgba(245,158,11,.3)', color: 'var(--amber)', marginLeft: 8 }} onClick={() => setView('submit')}>Submit questions →</button>
            </div>
          </div>
        )}

        {/* Submit form */}
        {view === 'submit' && (
          <div>
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={() => setView('list')}>← Back</button>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-title">Submit interview intel</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14 }}>Add questions from a real interview. Verified against hire events. Helps future candidates prepare.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 14 }}>
                <div className="offer-field"><label>Company</label><input className="inp" placeholder="e.g. Monzo" /></div>
                <div className="offer-field"><label>Role / level</label><input className="inp" placeholder="e.g. Senior PM" /></div>
                <div className="offer-field"><label>Stage</label><select className="sel"><option>Recruiter screen</option><option>HM interview</option><option>Case study</option><option>Panel</option></select></div>
                <div className="offer-field"><label>Outcome</label><select className="sel"><option>Offer received</option><option>No offer — screened out</option><option>I withdrew</option></select></div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text3)', marginBottom: 8 }}>Questions you were asked</div>
              <div className="submit-q-row"><input className="submit-q-inp" placeholder="Question 1…" /><select className="sel" style={{ width: 120 }}><option>Easy</option><option>Medium</option><option>Hard</option><option>Brutal</option></select></div>
              <div className="submit-q-row"><input className="submit-q-inp" placeholder="Question 2…" /><select className="sel" style={{ width: 120 }}><option>Easy</option><option>Medium</option><option>Hard</option><option>Brutal</option></select></div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 6, marginBottom: 14 }}>+ Add question</button>
              <textarea className="review-textarea" placeholder="Anything else worth knowing — how the process felt, what surprised you, what to prepare for…" style={{ marginBottom: 14 }} />
              <button className="btn btn-violet btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { showToast('Intel submitted anonymously ✓', 'success'); setView('list'); }}>Submit anonymously →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
