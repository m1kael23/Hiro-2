import { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  DNA_DIMENSIONS,
  DNA_ARCHETYPES,
  defaultDna,
  getDnaLabel,
  dnaToProfile,
} from '../../lib/dnaEngine';
import { fanOutCandidateMatches } from '../../lib/matchingEngine';

/* ─────────────────────────────────────────────
   SVG Radar Chart  (pure SVG, no lib needed)
───────────────────────────────────────────── */
function RadarChart({ dna, size = 200 }) {
  const cx = size / 2;
  const cy = size / 2;
  const R  = size * 0.38;
  const N  = 7;

  // Only use first 7 dims
  const values = dna.slice(0, N).map(v => v / 100);

  function point(i, r) {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
    return [cx + Math.cos(angle) * r * R, cy + Math.sin(angle) * r * R];
  }

  function toPath(pts) {
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + 'Z';
  }

  // Grid rings
  const rings   = [0.25, 0.5, 0.75, 1.0];
  const axes    = DNA_DIMENSIONS.map((_, i) => [point(i, 0), point(i, 1.05)]);
  const dataPath = toPath(values.map((v, i) => point(i, v)));
  const gridPaths = rings.map(r => toPath(DNA_DIMENSIONS.map((_, i) => point(i, r))));
  const labels  = DNA_DIMENSIONS.map((d, i) => {
    const [lx, ly] = point(i, 1.28);
    return { x: lx, y: ly, text: d.icon, label: d.label.split(' ')[0] };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {/* Grid */}
      {gridPaths.map((p, i) => (
        <path key={i} d={p} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="1" />
      ))}
      {/* Axes */}
      {axes.map(([a, b], i) => (
        <line key={i} x1={a[0].toFixed(1)} y1={a[1].toFixed(1)} x2={b[0].toFixed(1)} y2={b[1].toFixed(1)} stroke="rgba(255,255,255,.08)" strokeWidth="1" />
      ))}
      {/* Data fill */}
      <path d={dataPath} fill="rgba(108,71,255,.18)" stroke="#6c47ff" strokeWidth="2" strokeLinejoin="round" />
      {/* Data points */}
      {values.map((v, i) => {
        const [px, py] = point(i, v);
        return <circle key={i} cx={px.toFixed(1)} cy={py.toFixed(1)} r="3.5" fill="#a78bfa" stroke="#06070f" strokeWidth="1.5" />;
      })}
      {/* Labels */}
      {labels.map((l, i) => (
        <g key={i}>
          <text x={l.x.toFixed(1)} y={(l.y - 2).toFixed(1)} textAnchor="middle" fontSize="14" dominantBaseline="middle">{l.text}</text>
          <text x={l.x.toFixed(1)} y={(l.y + 12).toFixed(1)} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,.4)" fontFamily="Inter,sans-serif">{l.label}</text>
        </g>
      ))}
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Interactive Drag Slider
───────────────────────────────────────────── */
function DNASlider({ dim, value, onChange }) {
  const trackRef = useRef(null);

  const calc = useCallback((clientX) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct  = Math.round(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 100);
    onChange(pct);
  }, [onChange]);

  const onMouseDown = (e) => {
    e.preventDefault();
    calc(e.clientX);
    const move = (ev) => calc(ev.clientX);
    const up   = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  const onTouchStart = (e) => {
    e.preventDefault();
    calc(e.touches[0].clientX);
    const move = (ev) => calc(ev.touches[0].clientX);
    const end  = () => { document.removeEventListener('touchmove', move); document.removeEventListener('touchend', end); };
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', end);
  };

  const lbl = getDnaLabel(dim.id, value);
  const pct = value;

  return (
    <div style={{
      background: 'rgba(255,255,255,.03)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r)',
      padding: '14px 16px',
      transition: 'border-color .2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(108,71,255,.35)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{dim.icon}</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text3)' }}>{dim.num}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{dim.label}</div>
          </div>
        </div>
        <div style={{
          fontFamily: 'Manrope,sans-serif', fontSize: 18, fontWeight: 800,
          color: 'var(--violet)', minWidth: 36, textAlign: 'right',
        }}>{pct}</div>
      </div>

      {/* Poles */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--cyan)', maxWidth: '42%' }}>{dim.left} →</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#f9a8d4', maxWidth: '42%', textAlign: 'right' }}>← {dim.right}</span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        style={{
          position: 'relative', height: 6, borderRadius: 999,
          background: 'rgba(255,255,255,.08)', cursor: 'grab', userSelect: 'none',
          marginBottom: 10,
        }}
      >
        {/* Fill */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct}%`, borderRadius: 999,
          background: 'linear-gradient(90deg,var(--cyan),var(--violet),#f9a8d4)',
          transition: 'width .05s',
        }} />
        {/* Handle */}
        <div style={{
          position: 'absolute', top: '50%',
          left: `${pct}%`,
          transform: 'translate(-50%, -50%)',
          width: 18, height: 18, borderRadius: '50%',
          background: 'var(--violet)',
          border: '2px solid #fff',
          boxShadow: '0 0 12px rgba(108,71,255,.6)',
          transition: 'left .05s',
          cursor: 'grab',
        }} />
      </div>

      {/* Current label */}
      <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55, minHeight: 36 }}>{lbl}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Archetype Card
───────────────────────────────────────────── */
function ArchetypeCard({ archetype }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      borderRadius: 'var(--rl)',
      border: '1px solid rgba(108,71,255,.3)',
      background: 'linear-gradient(135deg,rgba(108,71,255,.1),rgba(12,14,26,.98))',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Glow */}
      <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${archetype.color}30, transparent 70%)`, pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 14, position: 'relative' }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: archetype.gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24,
          boxShadow: `0 8px 24px ${archetype.color}40`,
        }}>{archetype.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--text3)', marginBottom: 3 }}>Your DNA archetype</div>
          <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: archetype.color }}>{archetype.name}</div>
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 14 }}>{archetype.desc}</p>

      {/* Traits */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {archetype.traits.map(t => (
          <span key={t} style={{
            padding: '3px 11px', borderRadius: 'var(--rp)',
            background: `${archetype.color}18`,
            border: `1px solid ${archetype.color}40`,
            fontSize: 12, fontWeight: 600, color: archetype.color,
          }}>{t}</span>
        ))}
      </div>

      {/* Expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text3)', fontFamily: 'Inter', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        {expanded ? '▲ Less' : '▼ See best-fit environments & watch-outs'}
      </button>

      {expanded && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: '11px 13px', borderRadius: 'var(--r)', background: 'rgba(34,197,94,.07)', border: '1px solid rgba(34,197,94,.2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--green)', marginBottom: 6 }}>Best-fit environments</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {archetype.bestFit.map(b => (
                <span key={b} style={{ padding: '3px 9px', borderRadius: 'var(--rp)', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.25)', fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>{b}</span>
              ))}
            </div>
          </div>
          <div style={{ padding: '11px 13px', borderRadius: 'var(--r)', background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--amber)', marginBottom: 5 }}>Watch out for</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{archetype.watchOut}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Archetype Explorer (all 8 types)
───────────────────────────────────────────── */
function ArchetypeExplorer({ currentId }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: open ? 16 : 0 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>All 8 archetypes</div>
        <button
          onClick={() => setOpen(!open)}
          className="btn btn-ghost btn-sm"
        >{open ? 'Close ↑' : 'Explore all →'}</button>
      </div>

      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
          {DNA_ARCHETYPES.map(a => (
            <div key={a.id} style={{
              padding: '14px',
              borderRadius: 'var(--r)',
              border: a.id === currentId ? `1px solid ${a.color}` : '1px solid var(--border)',
              background: a.id === currentId ? `${a.color}10` : 'rgba(255,255,255,.02)',
              position: 'relative',
            }}>
              {a.id === currentId && (
                <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, fontWeight: 700, color: a.color, background: `${a.color}20`, padding: '2px 7px', borderRadius: 'var(--rp)' }}>You</div>
              )}
              <div style={{ fontSize: 22, marginBottom: 6 }}>{a.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: a.color, marginBottom: 4 }}>{a.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>{a.traits.slice(0, 2).join(' · ')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   DNA Match Preview (simulated job matches)
───────────────────────────────────────────── */
const SAMPLE_JOBS = [
  { co: 'Monzo', role: 'Sr PM — Payments', jobDna: [30, 20, 40, 25, 30, 55, 50], skills: 'Fintech · Payments · SQL' },
  { co: 'Revolut', role: 'Lead Product Manager', jobDna: [65, 65, 50, 70, 40, 75, 65], skills: 'Scale-up · Growth · Data' },
  { co: 'Synthesia', role: 'PM — AI Products', jobDna: [45, 35, 55, 40, 55, 80, 55], skills: 'AI/ML · B2B SaaS · Growth' },
  { co: 'Wise', role: 'Senior PM', jobDna: [40, 25, 45, 30, 50, 50, 45], skills: 'Payments · Fintech · Cross-functional' },
];

function score(candDna, jobDna) {
  let total = 0;
  let count = 0;
  for (let i = 0; i < 7; i++) {
    if (jobDna[i] == null) continue;
    const dist = Math.abs((candDna[i] || 50) - jobDna[i]);
    const s = Math.max(0, 1 - dist / 25);
    total += s * s;
    count++;
  }
  if (!count) return 85;
  return Math.min(99, Math.round((total / count) * 100));
}

function MatchPreview({ dna }) {
  const matches = SAMPLE_JOBS.map(j => ({ ...j, pct: score(dna, j.jobDna) }))
    .sort((a, b) => b.pct - a.pct);

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 4 }}>🤝 Live DNA match preview</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14 }}>How your current DNA scores against active roles. Updates as you move sliders.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {matches.map(m => (
          <div key={m.co} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(108,71,255,.15)', border: '1px solid rgba(108,71,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#a78bfa', flexShrink: 0, fontFamily: 'Manrope,sans-serif' }}>
              {m.co[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{m.co} — {m.role}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{m.skills}</div>
            </div>
            {/* Score bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{ width: 80, height: 4, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${m.pct}%`, background: m.pct > 80 ? 'var(--green)' : m.pct > 65 ? 'var(--violet)' : 'var(--amber)', borderRadius: 999, transition: 'width .3s ease' }} />
              </div>
              <span style={{ fontFamily: 'Manrope,sans-serif', fontSize: 14, fontWeight: 800, color: m.pct > 80 ? 'var(--green)' : m.pct > 65 ? '#a78bfa' : 'var(--amber)', minWidth: 34 }}>{m.pct}%</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10, lineHeight: 1.5 }}>
        🧬 DNA scores update in real-time. Final match score combines DNA fit + skills + salary alignment.
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main View
───────────────────────────────────────────── */
export default function CandWorkDNA() {
  const { showToast } = useApp();
  const { profile, updateProfile } = useAuth();
  const [dna, setDna] = useState(profile?.dna || defaultDna());
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('sliders'); // 'sliders' | 'radar' | 'archetypes'

  // Sync with profile if it changes
  useEffect(() => {
    if (profile?.dna) {
      setDna(profile.dna);
    }
  }, [profile?.dna]);

  const dnaProfile = dnaToProfile(dna);
  const archetype  = dnaProfile.archetype;

  const updateDim = useCallback((idx, val) => {
    setSaved(false);
    setDna(prev => { const n = [...prev]; n[idx] = val; return n; });
  }, []);

  const handleSave = async () => {
    try {
      await updateProfile({ dna });
      setSaved(true);
      showToast('Work DNA™ saved — recalculating your matches 🧬', 'success');

      // Fan out: score this candidate against all live jobs
      const updatedProfile = { ...profile, dna };
      fanOutCandidateMatches(updatedProfile).then(({ created }) => {
        if (created > 0) {
          showToast(`${created} match${created !== 1 ? 'es' : ''} updated 🧬`, 'success');
        }
      });
    } catch (err) {
      console.error("Failed to save DNA:", err);
      showToast('Failed to save DNA', 'error');
    }
  };

  const handleReset = () => {
    setDna(defaultDna());
    setSaved(false);
    showToast('DNA reset to defaults', 'default');
  };

  return (
    <div className="view">
      <div className="scroll">
        <div style={{ maxWidth: 860, paddingBottom: 60 }}>

          {/* ── HERO ──────────────────────────────────── */}
          <div style={{
            background: 'linear-gradient(135deg,rgba(108,71,255,.14),rgba(236,72,153,.08),rgba(12,14,26,.99))',
            border: '1px solid rgba(108,71,255,.25)',
            borderRadius: 'var(--rl)',
            padding: '24px 28px',
            marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 20, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', color: 'var(--violet)', marginBottom: 6 }}>Work DNA™ by Hiro</div>
              <h1 style={{ fontFamily: 'Manrope,sans-serif', fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 8, lineHeight: 1.1 }}>
                How do you <em style={{ fontStyle: 'normal', background: 'linear-gradient(135deg,#a78bfa,#f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>actually</em> work?
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.65, maxWidth: 480 }}>
                Not your CV. Not your job title. Your 7-dimension work style profile — used to score culture fit on every match. Honest answers get dramatically better results.
              </p>
            </div>
            {/* Score badge */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: `conic-gradient(${archetype.color} ${97}%, rgba(255,255,255,.08) 0)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 6px',
                boxShadow: `0 0 20px ${archetype.color}40`,
              }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 20, fontWeight: 800, color: archetype.color, lineHeight: 1 }}>97%</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>DNA complete</div>
            </div>
          </div>

          {/* ── ARCHETYPE CARD ──────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <ArchetypeCard archetype={archetype} dna={dna} />
          </div>

          {/* ── TABS ────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
            {[
              { id: 'sliders',    label: '🎚️ Dimensions' },
              { id: 'radar',      label: '📡 Radar view' },
              { id: 'archetypes', label: '🧬 All archetypes' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '8px 16px', border: 'none', background: 'none',
                  cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 600,
                  color: activeTab === t.id ? 'var(--text)' : 'var(--text3)',
                  borderBottom: activeTab === t.id ? '2px solid var(--violet)' : '2px solid transparent',
                  marginBottom: -1, transition: 'color .15s',
                }}
              >{t.label}</button>
            ))}
          </div>

          {/* ── SLIDERS TAB ─────────────────────────── */}
          {activeTab === 'sliders' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {DNA_DIMENSIONS.map((dim, i) => (
                <DNASlider
                  key={dim.id}
                  dim={dim}
                  value={dna[i]}
                  onChange={(val) => updateDim(i, val)}
                />
              ))}
            </div>
          )}

          {/* ── RADAR TAB ───────────────────────────── */}
          {activeTab === 'radar' && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 32, marginBottom: 20 }}>
              <RadarChart dna={dna} size={280} />
              <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {DNA_DIMENSIONS.map((dim, i) => (
                  <div key={dim.id} style={{ textAlign: 'center', padding: '8px 12px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 16 }}>{dim.icon}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{dim.label}</div>
                    <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 16, fontWeight: 800, color: '#a78bfa' }}>{dna[i]}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.6, maxWidth: 400 }}>
                The radar shows your position across all 7 dimensions. Employers see the shape — not the raw numbers.
              </div>
            </div>
          )}

          {/* ── ARCHETYPES TAB ──────────────────────── */}
          {activeTab === 'archetypes' && (
            <div style={{ marginBottom: 20 }}>
              <ArchetypeExplorer currentId={archetype.id} />
            </div>
          )}

          {/* ── MATCH PREVIEW ───────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <MatchPreview dna={dna} />
          </div>

          {/* ── SAVE BAR ────────────────────────────── */}
          <div style={{
            position: 'sticky', bottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px',
            borderRadius: 'var(--rl)',
            background: 'rgba(10,12,24,.97)',
            border: `1px solid ${saved ? 'rgba(34,197,94,.4)' : 'rgba(108,71,255,.4)'}`,
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 40px rgba(0,0,0,.6)',
            transition: 'border-color .3s',
            flexWrap: 'wrap', gap: 10,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: saved ? 'var(--green)' : 'var(--text)' }}>
                {saved ? '✓ DNA saved — matches recalculating' : `${archetype.emoji} ${archetype.name} · 7 dimensions set`}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                {saved ? 'Your culture-fit scores will update within seconds' : 'Save to apply your DNA to all active matches'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={handleReset}>Reset</button>
              <button className="btn btn-violet" onClick={handleSave} disabled={saved}>
                {saved ? 'Saved ✓' : 'Save DNA →'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
