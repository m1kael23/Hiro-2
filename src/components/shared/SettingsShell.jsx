/**
 * SettingsShell.jsx
 * Shared tabbed chrome for EmpSettings + CandSettings.
 * Usage: <SettingsShell tabs={[{id,label,icon,content}]} title="…" subtitle="…" />
 */
import { useState } from 'react';

export function SettingsShell({ tabs, title, subtitle }) {
  const [active, setActive] = useState(tabs[0].id);
  const current = tabs.find(t => t.id === active);

  return (
    <div className="view">
      <div className="scroll">
        <div style={{ maxWidth: 760, paddingBottom: 60 }}>

          {/* Page header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--text3)', marginBottom: 6 }}>Account</div>
            <h1 style={{ fontFamily: 'Manrope,sans-serif', fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6, lineHeight: 1.1 }}>{title}</h1>
            <p style={{ fontSize: 14, color: 'var(--text2)' }}>{subtitle}</p>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
                  fontFamily: 'Inter', fontSize: 13, fontWeight: 600,
                  color: active === t.id ? 'var(--text)' : 'var(--text3)',
                  borderBottom: active === t.id ? '2px solid var(--violet)' : '2px solid transparent',
                  marginBottom: -1, transition: 'color .15s', whiteSpace: 'nowrap',
                }}
              >
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div>{current?.content}</div>

        </div>
      </div>
    </div>
  );
}

/* ── Reusable section card ── */
export function Section({ title, subtitle, children, danger }) {
  return (
    <div style={{
      marginBottom: 16,
      border: `1px solid ${danger ? 'rgba(251,113,133,.25)' : 'var(--border)'}`,
      borderRadius: 'var(--rl)',
      background: danger ? 'rgba(251,113,133,.04)' : 'rgba(255,255,255,.02)',
      overflow: 'hidden',
    }}>
      {(title || subtitle) && (
        <div style={{ padding: '16px 20px 0' }}>
          {title && <div style={{ fontSize: 14, fontWeight: 700, color: danger ? 'var(--red)' : 'var(--text)', marginBottom: subtitle ? 3 : 14 }}>{title}</div>}
          {subtitle && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14, lineHeight: 1.55 }}>{subtitle}</div>}
        </div>
      )}
      <div style={{ padding: '0 20px 20px' }}>{children}</div>
    </div>
  );
}

/* ── Form field ── */
export function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 5 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

/* ── Text input ── */
export function Input({ value, onChange, placeholder, type = 'text', disabled }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '100%', padding: '9px 12px', borderRadius: 'var(--r)',
        background: disabled ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)',
        border: '1px solid var(--border)', color: disabled ? 'var(--text3)' : 'var(--text)',
        fontSize: 13, fontFamily: 'Inter', outline: 'none', boxSizing: 'border-box',
        cursor: disabled ? 'not-allowed' : 'text',
      }}
      onFocus={e => !disabled && (e.target.style.borderColor = 'rgba(108,71,255,.6)')}
      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
    />
  );
}

/* ── Toggle row ── */
export function ToggleRow({ label, sub, checked, onChange, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer',
          background: checked ? (color || 'var(--violet)') : 'rgba(255,255,255,.12)',
          position: 'relative', transition: 'background .2s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 2, left: checked ? 20 : 2,
          width: 18, height: 18, borderRadius: '50%',
          background: '#fff', transition: 'left .2s',
          boxShadow: '0 1px 4px rgba(0,0,0,.4)',
        }} />
      </button>
    </div>
  );
}

/* ── Save row ── */
export function SaveRow({ onSave, saved, loading }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
      {saved && <span style={{ fontSize: 12, color: 'var(--green)' }}>✓ Saved</span>}
      <button className="btn btn-violet btn-sm" onClick={onSave} disabled={loading}>
        {loading ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}
