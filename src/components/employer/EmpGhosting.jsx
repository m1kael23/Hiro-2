import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

const LOG = [
  { dot: '✓', dotStyle: { background: 'var(--green-lt)', border: '1px solid rgba(34,197,94,.3)' }, title: 'Alex Rivera — offer accepted', sub: 'Lead Eng · Responded within 1 day at every stage', badge: 'Exemplary', badgeStyle: { background: 'var(--green-lt)', border: '1px solid rgba(34,197,94,.25)', color: 'var(--green)' } },
  { dot: '✓', dotStyle: { background: 'var(--green-lt)', border: '1px solid rgba(34,197,94,.3)' }, title: 'Sarah Chen — moved to mutual', sub: 'Sr PM · Responded to interest within 4 hours', badge: 'Fast', badgeStyle: { background: 'var(--green-lt)', border: '1px solid rgba(34,197,94,.25)', color: 'var(--green)' } },
  { dot: '⚠', dotStyle: { background: 'rgba(251,113,133,.12)', border: '1px solid rgba(251,113,133,.25)' }, title: 'Mei Lin — Round 2 pending decision', sub: '16 days since last contact · Flag active', badge: 'Flagged', badgeStyle: { background: 'var(--red-lt)', border: '1px solid rgba(251,113,133,.25)', color: 'var(--red)' } },
  { dot: '↩', dotStyle: { background: 'var(--cyan-lt)', border: '1px solid rgba(56,189,248,.25)' }, title: 'Yuki Tanaka — declined after Round 1', sub: 'PM · Sent written feedback within 24h · Closed cleanly', badge: 'Closed well', badgeStyle: { background: 'var(--cyan-lt)', border: '1px solid rgba(56,189,248,.25)', color: 'var(--cyan)' } },
];

export default function EmpGhosting() {
  const { showToast } = useApp();
  const { profile } = useAuth();
  const [flagClosed, setFlagClosed] = useState(false);

  return (
    <div className="view">
      <div className="scroll">
        <div className="review-shell">
          <div className="page-hdr" style={{ maxWidth: 780, marginBottom: 18 }}>
            <div>
              <div className="eyebrow">Accountability layer</div>
              <div className="page-title">Ghosting Score</div>
              <div className="page-sub">Candidates see your response rate before they apply. Close the loop — it directly affects your Hiro Score™.</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => showToast('Ghost report exported to CSV', 'success')}>Export log</button>
          </div>

          {/* Hero */}
          <div className="ghost-hero">
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(139,92,246,.8)', marginBottom: 8 }}>{profile?.company_name || 'Monzo'} · Response health</div>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 10 }}>Your response rate is <span style={{ color: 'var(--green)' }}>excellent</span></div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
                  {[['94%', 'Response rate', 'var(--green)'], ['2.4d', 'Avg response time', 'var(--cyan)'], [flagClosed ? '0' : '1', 'Open flags', 'var(--amber)'], ['−0.1', 'Hiro Score impact', '#a78bfa']].map(([val, label, color]) => (
                    <div key={label}>
                      <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 32, fontWeight: 800, color }}>{val}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', maxWidth: 440, lineHeight: 1.7 }}>94% puts you in the top 15% of employers — a meaningful signal for passive candidates deciding whether to engage.</div>
              </div>
              {/* Ring */}
              <div className="ghost-score-ring">
                <svg width="96" height="96" viewBox="0 0 96 96">
                  <defs><linearGradient id="ghostGrad"><stop offset="0%" stopColor="#22c55e"/><stop offset="100%" stopColor="#38bdf8"/></linearGradient></defs>
                  <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="8"/>
                  <circle cx="48" cy="48" r="40" fill="none" stroke="url(#ghostGrad)" strokeWidth="8" strokeLinecap="round" strokeDasharray="251.2" strokeDashoffset="15"/>
                </svg>
                <div className="ghost-score-val">
                  <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 20, fontWeight: 800, color: '#fff' }}>94%</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>Response</div>
                </div>
              </div>
            </div>
          </div>

          {/* What triggers a flag */}
          <div style={{ padding: '12px 16px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border2)', fontSize: 12, color: 'var(--text2)', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div><strong style={{ color: 'var(--text)' }}>What triggers a ghost flag:</strong> No status update 14+ days after any interview stage, no response to a mutual match message within 7 days, or an offer rescinded with no explanation.</div>
          </div>

          <div className="g2">
            <div>
              {/* Active flags */}
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--red)', marginBottom: 10 }}>
                ⚠ Open flags ({flagClosed ? 0 : 1})
              </div>
              {!flagClosed ? (
                <div className="ghost-flag">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="ghost-dot" style={{ background: 'rgba(251,113,133,.12)', border: '1px solid rgba(251,113,133,.25)', fontSize: 14 }}>👤</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>Mei Lin — no update after Round 2</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>Interview completed 16 days ago · Sr PM role · Awaiting decision</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                    <button style={{ padding: '5px 14px', borderRadius: 999, background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.3)', color: 'var(--green)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }} onClick={() => { setFlagClosed(true); showToast('Loop closed for Mei Lin ✓', 'success'); }}>✓ Close loop</button>
                    <button style={{ padding: '5px 12px', borderRadius: 999, background: 'rgba(255,255,255,.06)', border: '1px solid var(--border2)', color: 'var(--text2)', fontSize: 12, cursor: 'pointer' }} onClick={() => showToast('Follow-up message sent to Mei', 'success')}>💬 Message</button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--r)', border: '1px solid rgba(34,197,94,.25)', background: 'rgba(34,197,94,.05)', fontSize: 12, color: 'var(--green)', marginBottom: 8 }}>✓ No open flags — response health excellent</div>
              )}

              {/* Log */}
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--text3)', margin: '16px 0 10px' }}>Response log · Last 30 days</div>
              <div className="card" style={{ padding: 0 }}>
                {LOG.map((item, i) => (
                  <div key={i} className="ghost-log-item" style={{ padding: '12px 16px' }}>
                    <div className="ghost-dot" style={item.dotStyle}>{item.dot}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>{item.sub}</div>
                    </div>
                    <span className="ghost-badge" style={item.badgeStyle}>{item.badge}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right sidebar */}
            <div>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">Industry benchmarks</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[['Your rate', '94%', 'var(--green)', '94%'], ['Top 15%', '90%+', '#a78bfa', '90%'], ['Platform avg', '71%', 'var(--cyan)', '71%'], ['Bottom 25%', '< 50%', 'var(--red)', '50%']].map(([label, val, color, pct]) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                        <span style={{ color: 'var(--text2)' }}>{label}</span>
                        <span style={{ fontWeight: 700, color }}>{val}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: pct, background: color, borderRadius: 'inherit' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="card-title">Score impact</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>Response rate accounts for <strong style={{ color: 'var(--text)' }}>15%</strong> of your Hiro Score™. Dropping below 80% triggers a warning badge visible to candidates browsing your jobs.</div>
                <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 'var(--r)', background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.2)', fontSize: 12, color: 'var(--green)' }}>
                  At 94% you&apos;re earning a +0.3 Hiro Score bonus vs platform average.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
