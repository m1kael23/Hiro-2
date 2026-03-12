import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export default function EmpBench() {
  const { showToast } = useApp();
  const { profile } = useAuth();

  const BENCH_CANDIDATES = [
    {
      initials: 'SC', bg: 'linear-gradient(135deg,#0d9488,#0891b2)',
      name: 'S.C. — Sr PM · Berlin',
      tier: 'Tier 1 · Prev match', tierStyle: { background: 'rgba(13,148,136,.2)', border: '1px solid rgba(13,148,136,.35)', color: 'var(--teal)' },
      avail: '🟢 Available from Aug 2025', availStyle: { background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.25)', color: 'var(--green)' },
      sub: '7yr exp · Fintech · Payments · The Strategist archetype',
      chips: [['chip-g', 'Skills 94%'], ['chip-p', '🧬 91%'], ['chip-c', 'Async-first'], ['chip-v', 'Data-driven']],
      reloc: true,
      insight: { style: { background: 'rgba(13,148,136,.08)', border: '1px solid rgba(13,148,136,.2)', color: 'var(--teal)' }, text: `🪑 Previously matched with ${profile?.company_name || 'Monzo'} for Sr PM role · Expressed interest · Process stalled — now open from Aug 2025` },
      btnLabel: 'Express interest →', btnStyle: { background: 'rgba(13,148,136,.2)', border: '1px solid rgba(13,148,136,.35)', color: 'var(--teal)' },
      toastMsg: "Interest expressed — S.C. will be notified when she&apos;s ready",
      borderColor: 'rgba(13,148,136,.3)', bg2: 'rgba(13,148,136,.05)',
    },
    {
      initials: 'ML', bg: 'linear-gradient(135deg,#6c47ff,#4f35cc)',
      name: 'M.L. — Lead PM · Amsterdam',
      tier: 'Tier 2 · DNA match', tierStyle: { background: 'rgba(108,71,255,.2)', border: '1px solid rgba(108,71,255,.35)', color: '#a78bfa' },
      avail: '🟡 Available from Oct 2025', availStyle: { background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.25)', color: 'var(--amber)' },
      sub: '5yr exp · B2B SaaS → Fintech · The Catalyst archetype',
      chips: [['chip-g', 'Skills 89%'], ['chip-p', '🧬 87%'], ['chip-v', 'Collaborative'], ['chip-c', 'Instinct-led']],
      reloc: false,
      btnLabel: 'Save interest →', btnStyle: { background: 'rgba(108,71,255,.2)', border: '1px solid rgba(108,71,255,.35)', color: '#a78bfa' },
      toastMsg: "Interest saved — M.L. will be notified when their availability opens",
      borderColor: 'var(--border2)', bg2: 'rgba(255,255,255,.03)',
    },
    {
      initials: 'KP', bg: 'linear-gradient(135deg,#f59e0b,#d97706)',
      name: 'K.P. — Sr PM · London',
      tier: 'Tier 2 · DNA match', tierStyle: { background: 'rgba(108,71,255,.2)', border: '1px solid rgba(108,71,255,.35)', color: '#a78bfa' },
      avail: '🔵 Open — no specific date', availStyle: { background: 'rgba(56,189,248,.1)', border: '1px solid rgba(56,189,248,.2)', color: 'var(--cyan)' },
      sub: '8yr exp · Consumer Fintech · The Strategist archetype',
      chips: [['chip-g', 'Skills 92%'], ['chip-p', '🧬 89%'], ['chip-v', 'Data-driven'], ['chip-c', 'Deep focus']],
      reloc: false,
      btnLabel: 'Express interest →', btnStyle: { background: 'rgba(108,71,255,.2)', border: '1px solid rgba(108,71,255,.35)', color: '#a78bfa' },
      toastMsg: "Interest expressed — K.P. will see this when they check in",
      borderColor: 'var(--border2)', bg2: 'rgba(255,255,255,.03)',
    },
  ];

  return (
    <div className="view">
      <div className="scroll">
        <div className="review-shell" style={{ maxWidth: 820 }}>
          <div className="page-hdr" style={{ maxWidth: 820, marginBottom: 18 }}>
            <div>
              <div className="eyebrow">Pre-emptive pipeline</div>
              <div className="page-title">The Bench</div>
              <div className="page-sub">Candidates open to future conversations — before they&apos;re actively looking. Filtered by DNA fit, trajectory, and availability horizon.</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="sel" style={{ width: 'auto' }}><option>All roles</option><option>Sr PM</option><option>Lead Engineer</option></select>
              <button className="btn btn-sm" style={{ background: 'rgba(13,148,136,.15)', border: '1px solid rgba(13,148,136,.3)', color: 'var(--teal)' }}>🪑 Browse bench →</button>
            </div>
          </div>

          {/* Stats */}
          <div className="g4" style={{ marginBottom: 18 }}>
            <div className="stat-tile" style={{ '--glow': 'rgba(13,148,136,.3)' }}><div className="stat-eyebrow">On The Bench</div><div className="stat-val" style={{ color: 'var(--teal)' }}>23</div><div className="stat-label">DNA-matched for your roles</div></div>
            <div className="stat-tile" style={{ '--glow': 'rgba(108,71,255,.3)' }}><div className="stat-eyebrow">Available soon</div><div className="stat-val" style={{ color: '#a78bfa' }}>8</div><div className="stat-label">Open in &lt; 3 months</div></div>
            <div className="stat-tile" style={{ '--glow': 'rgba(34,197,94,.25)' }}><div className="stat-eyebrow">Tier 1 (prev match)</div><div className="stat-val" style={{ color: 'var(--green)' }}>3</div><div className="stat-label">Already know {profile?.company_name || 'Monzo'}</div></div>
            <div className="stat-tile" style={{ '--glow': 'rgba(245,158,11,.2)' }}><div className="stat-eyebrow">Avg DNA fit</div><div className="stat-val" style={{ color: 'var(--amber)' }}>88%</div><div className="stat-label">Bench candidates</div></div>
          </div>

          {/* Filter bar */}
          <div style={{ display: 'flex', gap: 7, marginBottom: 14, flexWrap: 'wrap' }}>
            {['All 23', '🕐 Available now (8)', '🎯 Sr PM track', '🧬 DNA 90%+', '⭐ Tier 1 only'].map((f, i) => (
              <span key={f} className={`fchip${i === 0 ? ' on' : ''}`}>{f}</span>
            ))}
          </div>

          {/* Candidate cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {BENCH_CANDIDATES.map(c => (
              <div key={c.name} className="bench-cand-card" style={{ borderColor: c.borderColor, background: c.bg2 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Manrope',sans-serif", fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{c.initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div>
                      <span className="tier-badge" style={c.tierStyle}>{c.tier}</span>
                      <span className="bench-avail-badge" style={c.availStyle}>{c.avail}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{c.sub}</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {c.chips.map(([cls, label]) => <span key={label} className={`chip ${cls}`}>{label}</span>)}
                      {c.reloc && <span className="reloc" style={{ fontSize: 12 }}>📦 Relocation</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-sm" style={c.btnStyle} onClick={() => showToast(c.toastMsg, 'success')}>{c.btnLabel}</button>
                    <button className="btn btn-ghost btn-sm">View DNA →</button>
                  </div>
                </div>
                {c.insight && (
                  <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 'var(--r)', ...c.insight.style, fontSize: 12 }}>{c.insight.text}</div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, padding: 16, background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', marginTop: 16 }}>
            {[['1,847', 'On The Bench', 'var(--teal)'], ['34%', 'Hired in 6 months', 'var(--green)'], ['9 days', 'Avg time to hire', 'var(--cyan)'], ['60%', 'Skip full process', '#a78bfa']].map(([val, label, color], i) => (
              <div key={label} style={{ textAlign: 'center', borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 20, fontWeight: 800, color, lineHeight: 1, marginBottom: 3 }}>{val}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
