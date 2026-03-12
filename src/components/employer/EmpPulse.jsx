import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

const DIM_BARS = [
  { icon: '🚀', label: 'Growth', pct: 84, color: 'linear-gradient(90deg,#22c55e,#0d9488)', valColor: 'var(--green)', val: 84 },
  { icon: '🎯', label: 'Autonomy', pct: 79, color: 'linear-gradient(90deg,#22c55e,#0d9488)', valColor: 'var(--green)', val: 79 },
  { icon: '👥', label: 'Team fit', pct: 81, color: 'linear-gradient(90deg,#38bdf8,#6c47ff)', valColor: 'var(--cyan)', val: 81 },
  { icon: '💰', label: 'Comp satisfaction', pct: 68, color: 'linear-gradient(90deg,#f59e0b,#ef4444)', valColor: 'var(--amber)', val: 68 },
  { icon: '🧭', label: 'Trajectory', pct: 62, color: 'linear-gradient(90deg,#f59e0b,#ef4444)', valColor: 'var(--amber)', val: 62 },
];

const HIRES = [
  { score: 84, stroke: '#22c55e', offset: 26, label: 'Hire 1', trend: 'Trending up — strong onboarding engagement', tags: ['Growth 92', 'Team fit 88', 'Autonomy 84'], expanded: false },
  { score: 79, stroke: '#38bdf8', offset: 34, label: 'Hire 2', trend: 'Stable — consistent scores across pulses', tags: ['Growth 80', 'Team fit 79', 'Autonomy 81'], expanded: false },
  { score: 61, stroke: '#f59e0b', offset: 62, label: 'Hire 3', trend: 'Drifting — comp and trajectory declining', tags: ['Comp 58', 'Trajectory 55', 'Growth 72'], expanded: false, drift: true },
];

export default function EmpPulse() {
  const { showToast } = useApp();
  const { profile } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState({});

  return (
    <div className="view">
      {/* Schedule Pulse Modal */}
      {showModal && (
        <div className="pulse-modal show">
          <div className="pulse-modal-inner">
            <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Schedule a pulse check-in</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 18 }}>Pulses are sent anonymously. Individual scores are private — you see aggregate only.</div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Send to</label>
              <select className="sel"><option>All 3 {profile?.company_name || 'Monzo'} hires</option><option>Hires placed in last 90 days</option><option>Hires showing drift signals</option></select>
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Send date</label>
              <input className="inp" type="date" defaultValue="2026-03-14" />
            </div>
            <div className="field" style={{ marginBottom: 18 }}>
              <label>Message (optional)</label>
              <textarea className="inp textarea" rows={2} placeholder="Hi — just a quick 2-minute check-in. Your answers are private and help us support you better." />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-violet" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setShowModal(false); showToast('Pulse scheduled for 14 Mar ✓', 'success'); }}>Schedule →</button>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="scroll">
        <div style={{ maxWidth: 820 }}>
          <div className="page-hdr" style={{ maxWidth: 820, marginBottom: 18 }}>
            <div>
              <div className="eyebrow">Aggregate only · individual scores private</div>
              <div className="page-title">Team Pulse</div>
              <div className="page-sub">Spot drift early, act before you lose someone. Individual scores are never shown to you.</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => showToast('Pulse sent to all 3 hires ✓', 'success')}>⚡ Send pulse now</button>
              <button className="btn btn-violet btn-sm" onClick={() => setShowModal(true)}>📅 Schedule check-in</button>
            </div>
          </div>

          {/* Stats */}
          <div className="g4" style={{ marginBottom: 18 }}>
            <div className="stat-tile" style={{ '--glow': 'rgba(236,72,153,.25)' }}><div className="stat-eyebrow">Team health avg</div><div className="stat-val" style={{ color: '#ec4899' }}>76</div><div className="stat-label">Across 3 Hiro hires</div></div>
            <div className="stat-tile" style={{ '--glow': 'rgba(245,158,11,.2)' }}><div className="stat-eyebrow">Drift signals</div><div className="stat-val" style={{ color: 'var(--amber)' }}>1</div><div className="stat-label">Worth a 1-1</div></div>
            <div className="stat-tile" style={{ '--glow': 'rgba(34,197,94,.25)' }}><div className="stat-eyebrow">Pulses completed</div><div className="stat-val" style={{ color: 'var(--green)' }}>100%</div><div className="stat-label">All 3 responded</div></div>
            <div className="stat-tile" style={{ '--glow': 'rgba(56,189,248,.2)' }}><div className="stat-eyebrow">Retention forecast</div><div className="stat-val" style={{ color: 'var(--cyan)' }}>2/3</div><div className="stat-label">High confidence 12mo</div></div>
          </div>

          {/* Drift alert */}
          <div style={{ padding: '14px 16px', borderRadius: 'var(--rl)', border: '1px solid rgba(245,158,11,.35)', background: 'rgba(245,158,11,.07)', display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 18, cursor: 'pointer' }} onClick={() => setExpanded(e => ({ ...e, hire3: !e.hire3 }))}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--amber)', marginBottom: 3 }}>Drift signal detected · Hire 3</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>Trajectory alignment and comp satisfaction have dropped across 2 consecutive pulses. Recommend a 1-1 conversation focused on growth path and role scope. <span style={{ color: 'var(--amber)' }}>Click to see details →</span></div>
            </div>
            <div style={{ flexShrink: 0 }}>
              <button className="btn btn-sm" style={{ background: 'rgba(245,158,11,.15)', border: '1px solid rgba(245,158,11,.4)', color: 'var(--amber)' }} onClick={e => { e.stopPropagation(); setShowModal(true); }}>Book 1-1 →</button>
            </div>
          </div>

          {/* Aggregate health bars */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--text3)', marginBottom: 14 }}>Team health by dimension · aggregate</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {DIM_BARS.map(({ icon, label, pct, color, val, valColor }) => (
                <div key={label} className="dim-health-row">
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, flex: '0 0 150px' }}>{label}</span>
                  <div className="dim-health-bar"><div className="dim-health-fill" style={{ width: `${pct}%`, background: color }}></div></div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: valColor, width: 36, textAlign: 'right' }}>{val}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, padding: '9px 12px', borderRadius: 'var(--r)', background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.2)', fontSize: 12, color: 'var(--amber)' }}>
              Comp satisfaction (68) and trajectory (62) are below healthy threshold. These two dimensions predict turnover 4 months before it happens.
            </div>
          </div>

          {/* Per-hire health rings */}
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--text3)', marginBottom: 10 }}>Anonymous hire health · click to expand</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {HIRES.map((hire, i) => (
              <div key={hire.label}>
                <div className={`hire-pulse-card${expanded[`hire${i+1}`] ? ' expanded' : ''}`} onClick={() => setExpanded(e => ({ ...e, [`hire${i+1}`]: !e[`hire${i+1}`] }))}>
                  <div style={{ flexShrink: 0, position: 'relative' }}>
                    <svg width="64" height="64" viewBox="0 0 64 64" className="pulse-ring-svg">
                      <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="6"/>
                      <circle cx="32" cy="32" r="26" fill="none" stroke={hire.stroke} strokeWidth="6" strokeLinecap="round" strokeDasharray="163.4" strokeDashoffset={hire.offset}/>
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontFamily: "'Manrope',sans-serif", fontSize: 14, fontWeight: 800, color: hire.stroke, textAlign: 'center' }}>{hire.score}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{hire.label}</div>
                      {hire.drift && <span className="chip chip-a" style={{ fontSize: 10 }}>⚠ Drift signal</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{hire.trend}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {hire.tags.map(t => <span key={t} className="chip chip-x" style={{ fontSize: 10 }}>{t}</span>)}
                    </div>
                  </div>
                </div>
                {expanded[`hire${i+1}`] && (
                  <div style={{ padding: '12px 16px', borderRadius: 'var(--r)', background: 'rgba(108,71,255,.05)', border: '1px solid rgba(108,71,255,.15)', marginTop: 4, fontSize: 12, color: 'var(--text2)' }}>
                    <div style={{ fontWeight: 700, color: '#a78bfa', marginBottom: 6 }}>Dimension breakdown</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {hire.tags.map(t => {
                        const [label, val] = t.split(' ');
                        const pct = parseInt(val);
                        return (
                          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 120, fontSize: 11, color: 'var(--text3)' }}>{label}</span>
                            <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? 'var(--green)' : pct >= 70 ? 'var(--cyan)' : 'var(--amber)', borderRadius: 'inherit' }}></div>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: pct >= 80 ? 'var(--green)' : pct >= 70 ? 'var(--cyan)' : 'var(--amber)', width: 28, textAlign: 'right' }}>{val}</span>
                          </div>
                        );
                      })}
                    </div>
                    {hire.drift && (
                      <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 'var(--r)', background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.2)', color: 'var(--amber)' }}>
                        🧬 DNA coaching tip: This hire shows comp and trajectory tension. Recommended action: schedule a 30-min career conversation focused on growth path clarity.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Privacy note */}
          <div style={{ padding: '12px 16px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border2)', fontSize: 12, color: 'var(--text2)' }}>
            🔒 Individual pulse responses are <strong style={{ color: 'var(--text)' }}>never shown to you</strong>. You see aggregate scores and trend signals only. This is enforced by design — candidates trust Hiro because of this guarantee.
          </div>
        </div>
      </div>
    </div>
  );
}
