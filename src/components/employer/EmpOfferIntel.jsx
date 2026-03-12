import { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function EmpOfferIntel() {
  const { showToast } = useApp();
  const [showOih1, setShowOih1] = useState(false);
  const [showOih2, setShowOih2] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const ROLES = [
    {
      title: 'Sr PM — Payments', band: 'Band: £90–120k · Market P50: £105k', status: 'Competitive ✓', statusCls: 'chip-g',
      barBand: { left: '38%', width: '29%', bg: 'linear-gradient(90deg,rgba(34,197,94,.4),rgba(34,197,94,.6))' },
      markerYour: '47%', markerMkt: '55%', legend: ['● Green = your band', 'Dark line = market P50', 'Light = your midpoint'],
      oihKey: 1, showOih: showOih1, setShowOih: setShowOih1,
      history: [
        { name: 'Tom Nakamura · Data Lead', status: 'Accepted', cls: 'chip-g', detail: '£118k · 2d to accept' },
        { name: 'Candidate A · Sr PM', status: 'Accepted', cls: 'chip-g', detail: '£110k · 4d to accept' },
        { name: 'Candidate B · Sr PM', status: 'Declined', cls: 'chip-r', detail: '£95k · cited comp' },
      ],
      cardStyle: { border: '1px solid rgba(34,197,94,.25)', background: 'rgba(34,197,94,.05)' },
    },
    {
      title: 'Lead Engineer — Growth', band: 'Band: £120–150k · Market P50: £158k', status: '⚠ Below market', statusCls: '',
      statusStyle: { background: 'rgba(245,158,11,.15)', border: '1px solid rgba(245,158,11,.3)', color: 'var(--amber)', fontSize: 10 },
      barBand: { left: '28%', width: '25%', bg: 'linear-gradient(90deg,rgba(245,158,11,.4),rgba(245,158,11,.6))' },
      markerYour: '40%', markerMkt: '72%', legend: ['● Amber = your band', 'P50 is to the right of your ceiling'],
      oihKey: 2, showOih: showOih2, setShowOih: setShowOih2,
      alert: { text: '⚠ Band tops out £8k below market P50. 2 of last 3 offers declined citing comp.', cta: 'Raise ceiling →' },
      history: [
        { name: 'Candidate C · Lead Eng', status: 'Declined', cls: 'chip-r', detail: '£148k · cited comp · went to Revolut' },
        { name: 'Candidate D · Lead Eng', status: 'Declined', cls: 'chip-r', detail: '£145k · cited comp' },
        { name: 'Marcus Wei · Lead Eng', status: 'In progress', cls: '', style: { color: 'var(--amber)' }, detail: 'Offer pending' },
      ],
      cardStyle: { border: '1px solid rgba(245,158,11,.3)', background: 'rgba(245,158,11,.06)' },
    },
  ];

  return (
    <div className="view">
      <div className="scroll">
        <div className="review-shell" style={{ maxWidth: 780 }}>
          <div className="page-hdr" style={{ maxWidth: 780, marginBottom: 18 }}>
            <div>
              <div className="eyebrow">Offer conversion intelligence</div>
              <div className="page-title">Offer Intelligence</div>
              <div className="page-sub">See where your offers land vs market. Identify comp risk before it becomes a rejection.</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => showToast('Comp report exported', 'success')}>Export report</button>
          </div>

          <div className="g4" style={{ marginBottom: 18 }}>
            <div className="stat-tile" style={{ '--glow': 'rgba(34,197,94,.25)' }}><div className="stat-eyebrow">Offer acceptance</div><div className="stat-val" style={{ color: 'var(--green)' }}>78%</div><div className="stat-label">Last 12 months</div><div className="stat-delta up">↑ vs 64% avg</div></div>
            <div className="stat-tile" style={{ '--glow': 'rgba(56,189,248,.25)' }}><div className="stat-eyebrow">Avg time to accept</div><div className="stat-val" style={{ color: 'var(--cyan)' }}>3.2d</div><div className="stat-label">After offer sent</div></div>
            <div className="stat-tile" style={{ '--glow': 'rgba(245,158,11,.2)', cursor: 'pointer' }} onClick={() => setShowModal(true)}><div className="stat-eyebrow">Competitive gaps</div><div className="stat-val" style={{ color: 'var(--amber)' }}>2</div><div className="stat-label">Roles below market</div><div className="stat-delta warn">Fix now →</div></div>
            <div className="stat-tile" style={{ '--glow': 'rgba(251,113,133,.2)' }}><div className="stat-eyebrow">Lost to comp</div><div className="stat-val" style={{ color: 'var(--red)' }}>3</div><div className="stat-label">Offer rejections · last 6mo</div></div>
          </div>

          {/* Comp health by role */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Comp health by role</div>
              <span className="chip chip-x" style={{ fontSize: 10 }}>vs verified Hiro market data</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ROLES.map(role => (
                <div key={role.title} style={{ padding: '14px 16px', borderRadius: 'var(--r)', ...role.cardStyle }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{role.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>{role.band}</div>
                    </div>
                    {role.statusStyle
                      ? <span className="chip" style={role.statusStyle}>{role.status}</span>
                      : <span className={`chip ${role.statusCls}`}>{role.status}</span>
                    }
                  </div>
                  {/* Market bar */}
                  <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,.08)', position: 'relative', marginBottom: 6 }}>
                    <div style={{ position: 'absolute', left: role.barBand.left, top: 0, height: '100%', width: role.barBand.width, background: role.barBand.bg, borderRadius: 'inherit' }}></div>
                    <div className="market-bar-marker" style={{ left: role.markerYour, background: role.title.includes('Sr PM') ? 'var(--green)' : 'var(--amber)' }}></div>
                    <div className="market-bar-marker" style={{ left: role.markerMkt, background: 'rgba(255,255,255,.4)' }}></div>
                  </div>
                  <div className="mkt-legend">{role.legend.map(l => <span key={l}>{l}</span>)}</div>
                  {role.alert && (
                    <div className="comp-alert-bar" style={{ marginTop: 10 }}>
                      {role.alert.text}
                      <button className="btn btn-sm" style={{ marginLeft: 'auto', background: 'rgba(245,158,11,.15)', border: '1px solid rgba(245,158,11,.4)', color: 'var(--amber)' }} onClick={() => setShowModal(true)}>{role.alert.cta}</button>
                    </div>
                  )}
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 8, fontSize: 12 }} onClick={() => { role.oihKey === 1 ? setShowOih1(!showOih1) : setShowOih2(!showOih2) }}>
                    {role.showOih ? '▲ Hide offer history' : '▼ Show offer history'}
                  </button>
                  {role.showOih && (
                    <div style={{ marginTop: 10 }}>
                      {role.history.map((h, i) => (
                        <div key={i} className="offer-history-row">
                          <span style={{ flex: 1, fontWeight: 600 }}>{h.name}</span>
                          {h.cls
                            ? <span className={`chip ${h.cls}`} style={{ fontSize: 10 }}>{h.status}</span>
                            : <span style={h.style || {}}>{h.status}</span>
                          }
                          <span style={{ color: 'var(--text2)' }}>{h.detail}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Hiro recommendation */}
          <div style={{ padding: '14px 16px', borderRadius: 'var(--r)', background: 'var(--violet-lt)', border: '1px solid var(--violet-md)', fontSize: 12, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.65 }}>
            ⚡ <strong style={{ color: '#a78bfa' }}>Hiro recommendation:</strong> Raising the Lead Eng ceiling to £165k would put you above market P50. Hiro data: this change correlates with a 31% improvement in offer acceptance for this role type. Estimated cost impact: +£15k per hire.
          </div>

          {/* Market intelligence */}
          <div className="card">
            <div className="card-title">Market intelligence · Sr PM · London</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14 }}>From 312 verified closed offers on Hiro. Updated monthly.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
              {[['P25', '£88k', 'var(--text)'], ['P50', '£105k', '#a78bfa'], ['P75', '£125k', 'var(--text)'], ['P90', '£145k', 'var(--cyan)']].map(([pct, val, color]) => (
                <div key={pct} style={{ textAlign: 'center', padding: '12px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border2)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>{pct}</div>
                  <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 18, fontWeight: 800, color }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Trend: Sr PM salaries up <strong style={{ color: '#a78bfa' }}>+8%</strong> YoY in London fintech. Competition highest from Revolut (+18% band), Wise (+12%), and GoCardless (+9%).</div>
          </div>
        </div>
      </div>

      {/* Raise band modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 'var(--rl)', padding: 28, width: 400, maxWidth: '90vw' }}>
            <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Raise compensation ceiling</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 18 }}>Updating your band in Hiro will reflect across all live job cards and candidate match notifications immediately.</div>
            <div className="offer-field" style={{ marginBottom: 12 }}>
              <label>New ceiling</label>
              <input className="inp" defaultValue="£165,000" />
            </div>
            <div className="offer-field" style={{ marginBottom: 18 }}>
              <label>Reason</label>
              <select className="sel"><option>Market adjustment</option><option>Internal levelling update</option><option>Offer was declined on comp</option></select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-violet" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setShowModal(false); showToast('Band updated — job cards refreshed ✓', 'success'); }}>Update band →</button>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
