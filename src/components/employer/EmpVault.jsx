import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export default function EmpVault() {
  const { showToast } = useApp();
  const { profile } = useAuth();

  const REPORTS = [
    {
      id: 'vr1',
      title: 'Sr PM — Payments · Round 2 → Offer',
      sub: 'Process: 3 stages · 18 days · Hired ✓ · 5 days ago',
      score: '5.0', scoreColor: 'var(--green)',
      details: {
        grid: [['Process length', '18 days · 3 stages ✓'], ['Salary transparency', 'Confirmed upfront ✓', 'var(--green)'], ['Interviewer preparation', 'Well-briefed ✓', 'var(--green)'], ['Feedback quality', 'Detailed ✓', 'var(--green)']],
        quote: '"Genuinely one of the best hiring experiences I&apos;ve had. Sarah was responsive and the whole team felt aligned."',
        quoteColor: 'rgba(34,197,94,.4)',
      },
    },
    {
      id: 'vr2',
      title: 'Sr PM — Payments · Round 2 → Rejected',
      sub: 'Process: 2 stages · 12 days · Rejected · 2 weeks ago',
      score: '3.2', scoreColor: 'var(--amber)',
      details: {
        grid: [['Process length', '12 days ✓'], ['Salary transparency', 'Confirmed ✓', 'var(--green)'], ['Interviewer preparation', 'Good ✓', 'var(--green)'], ['Feedback after rejection', 'None given 🚩', 'var(--red)']],
        quote: `"Process felt good until the rejection — no feedback at all. Given ${profile?.company_name || 'Monzo'}&apos;s reputation I expected more."`,
        quoteColor: 'rgba(251,113,133,.4)',
      },
    },
    {
      id: 'vr3',
      title: 'Lead Engineer · Round 1 → Rejected',
      sub: 'Process: 1 stage · 8 days · Rejected · 3 weeks ago',
      score: '4.1', scoreColor: 'var(--amber)',
      details: {
        grid: [['Process length', '8 days ✓', 'var(--green)'], ['Salary transparency', 'Band shared late', 'var(--amber)'], ['Feedback after rejection', 'Brief note sent ✓', 'var(--green)'], ['Case study prep info', 'Missing 🚩', 'var(--red)']],
        quote: '"Quick process, friendly team. Salary only came up at offer stage which felt like a missed opportunity to align earlier."',
        quoteColor: 'rgba(245,158,11,.4)',
      },
    },
  ];

  const [expanded, setExpanded] = useState({});
  const [showPrepEditor, setShowPrepEditor] = useState(false);
  const [showFlagResolve, setShowFlagResolve] = useState(false);
  const [flagResolved, setFlagResolved] = useState(false);
  const [vaultFlagCount, setVaultFlagCount] = useState(1);

  function resolveFlag() {
    setFlagResolved(true);
    setVaultFlagCount(0);
    showToast('Flag resolved — Hiro Score will update within 24 hours', 'success');
  }

  return (
    <div className="view">
      <div className="scroll">
        <div className="review-shell" style={{ maxWidth: 780 }}>
          <div className="page-hdr" style={{ maxWidth: 780, marginBottom: 18 }}>
            <div>
              <div className="eyebrow">What candidates say about your process</div>
              <div className="page-title">Interview Vault</div>
              <div className="page-sub">See exactly how candidates experience your hiring process — and earn the Transparent Process badge.</div>
            </div>
          </div>

          <div className="g4" style={{ marginBottom: 18 }}>
            <div className="stat-tile" style={{ '--glow': 'rgba(245,158,11,.25)' }}><div className="stat-eyebrow">Process rating</div><div className="stat-val" style={{ color: 'var(--amber)' }}>4.4</div><div className="stat-label">Out of 5 · 14 reports</div></div>
            <div className="stat-tile" style={{ '--glow': 'rgba(34,197,94,.25)' }}><div className="stat-eyebrow">Transparent badge</div><div className="stat-val" style={{ color: 'var(--green)' }}>✓</div><div className="stat-label">Shown on all job cards</div></div>
            <div className="stat-tile" style={{ '--glow': 'rgba(56,189,248,.2)' }}><div className="stat-eyebrow">Conversion uplift</div><div className="stat-val" style={{ color: 'var(--cyan)' }}>+22%</div><div className="stat-label">vs no badge employers</div></div>
            <div className="stat-tile" style={{ '--glow': 'rgba(251,113,133,.2)' }}><div className="stat-eyebrow">Flagged issues</div><div className="stat-val" style={{ color: 'var(--red)' }}>{vaultFlagCount}</div><div className="stat-label">Worth addressing</div></div>
          </div>

          {/* Themes */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--text3)', marginBottom: 12 }}>Themes from candidate feedback</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Positive */}
              <div style={{ padding: '11px 14px', borderRadius: 'var(--r)', border: '1px solid rgba(34,197,94,.25)', background: 'rgba(34,197,94,.05)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 14 }}>👍</span>
                <div><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 3 }}>Positive — mentioned in 11 of 14 reports</div><div style={{ fontSize: 12, color: 'var(--text2)' }}>Fast process, respectful of candidate time, interviewers well-briefed on the role, salary range confirmed upfront.</div></div>
              </div>

              {/* Improvement */}
              <div style={{ padding: '11px 14px', borderRadius: 'var(--r)', border: '1px solid rgba(245,158,11,.25)', background: 'rgba(245,158,11,.05)' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 14 }}>⚠️</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', marginBottom: 3 }}>Improvement — mentioned in 6 of 14 reports</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>Case study difficulty was surprising — candidates felt quantitative expectations weren&apos;t signalled in advance. Consider adding a prep guide.</div>
                    <button className="btn btn-sm" style={{ background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.35)', color: 'var(--amber)' }} onClick={() => setShowPrepEditor(!showPrepEditor)}>+ Add prep guide to job listing</button>
                  </div>
                </div>
                {showPrepEditor && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Prep guide (shown to candidates before case study stage)</div>
                    <textarea className="inp textarea" rows={4} placeholder="The case study is a 60-minute analytical exercise. You'll be given a dataset and asked to identify growth opportunities. We recommend being comfortable with SQL and presenting data-backed recommendations…" />
                    <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
                      <button className="btn btn-violet btn-sm" onClick={() => { setShowPrepEditor(false); showToast('Prep guide saved and published ✓', 'success'); }}>Save + publish →</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setShowPrepEditor(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Flag */}
              {!flagResolved ? (
                <div style={{ padding: '11px 14px', borderRadius: 'var(--r)', border: '1px solid rgba(251,113,133,.25)', background: 'rgba(251,113,133,.05)' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 14 }}>🚩</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', marginBottom: 3 }}>Flag — mentioned in 3 reports</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>No feedback given after rejection at Round 2. Candidates expected written feedback given {profile?.company_name || 'Monzo'}&apos;s brand.</div>
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                        <button className="btn btn-sm" style={{ background: 'rgba(251,113,133,.12)', border: '1px solid rgba(251,113,133,.35)', color: 'var(--red)' }} onClick={() => setShowFlagResolve(!showFlagResolve)}>Resolve this flag →</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => showToast('Rejection template opened in editor', 'default')}>Use feedback template</button>
                      </div>
                      {showFlagResolve && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>How will you address this?</div>
                          <select className="sel" style={{ marginBottom: 8 }}>
                            <option>We will now send written feedback to all Round 2+ rejections</option>
                            <option>We will use Hiro&apos;s feedback template going forward</option>
                            <option>We have updated our hiring process documentation</option>
                          </select>
                          <button className="btn btn-violet btn-sm" onClick={resolveFlag}>Mark resolved →</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '11px 14px', borderRadius: 'var(--r)', border: '1px solid rgba(34,197,94,.25)', background: 'rgba(34,197,94,.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: 'var(--green)', fontSize: 14 }}>✓</span>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>Flag resolved — Hiro Score will update within 24 hours</div>
                </div>
              )}
            </div>
          </div>

          {/* Hiro recommendation */}
          <div style={{ padding: '14px 16px', borderRadius: 'var(--r)', background: 'var(--violet-lt)', border: '1px solid var(--violet-md)', fontSize: 12, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.65 }}>
            ⚡ <strong style={{ color: '#a78bfa' }}>Hiro recommendation:</strong> Add a prep guide to Round 2. Hiro data shows this reduces candidate anxiety flags by 71% and improves show-up rate by 18%. Estimated Hiro Score impact: <strong style={{ color: '#a78bfa' }}>+0.3 points</strong>.
          </div>

          {/* Individual reports */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Individual reports <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 12 }}>· anonymous · verified hire events only</span></div>
              <select className="sel" style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}>
                <option>All roles</option><option>Sr PM — Payments</option><option>Lead Engineer</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {REPORTS.map(r => (
                <div key={r.id}>
                  <div className="vault-report-item" onClick={() => setExpanded(e => ({ ...e, [r.id]: !e[r.id] }))}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{r.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)' }}>{r.sub}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, fontWeight: 800, color: r.scoreColor }}>{r.score}</span>
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{expanded[r.id] ? '▲' : '▼'}</span>
                      </div>
                    </div>
                  </div>
                  {expanded[r.id] && (
                    <div className="vault-report-detail show">
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        {r.details.grid.map(([label, val, color]) => (
                          <div key={label}>
                            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>{label}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: color || 'var(--text)' }}>{val}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', fontStyle: 'italic', borderLeft: `3px solid ${r.details.quoteColor}`, paddingLeft: 10 }}>{r.details.quote}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
