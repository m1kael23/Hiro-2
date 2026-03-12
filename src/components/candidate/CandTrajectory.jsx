import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

const PATHS = {
  a: {
    id: 'a', icon: '🚀', title: 'The fast track', color: 'var(--cyan)', timeBg: 'rgba(56,189,248,.12)', timeBorder: 'rgba(56,189,248,.25)', time: 'VP in 4–5 years',
    desc: "Join a Series A–B as first or second PM hire. High scope, high ownership, faster title progression. Risk: less structure, more ambiguity. Your async-first DNA fits well.",
    chips: [['chip-c', 'Series A–B'], ['chip-c', 'High ownership']],
  },
  b: {
    id: 'b', icon: '🏗️', title: 'The deep builder', color: '#a78bfa', timeBg: 'rgba(108,71,255,.12)', timeBorder: 'rgba(108,71,255,.3)', time: 'Director in 3–4 years',
    desc: "Stay in fintech, deepen payments domain expertise, build toward a Director or GPM role at a scale-up. Your data-driven DNA + fintech depth makes you rare at this level.",
    chips: [['chip-v', 'Series C–D'], ['chip-v', 'Domain depth']],
  },
  c: {
    id: 'c', icon: '🌐', title: 'The platform move', color: 'var(--teal)', timeBg: 'rgba(13,148,136,.12)', timeBorder: 'rgba(13,148,136,.3)', time: 'Staff / Principal in 2 years',
    desc: "Move into platform or infrastructure product — API products, developer tools, embedded finance. Highest salary ceiling, most transferable skills. Your Strategist archetype fits perfectly.",
    chips: [['chip-x', 'Platform'], ['chip-x', 'API / infra']],
  },
};

const MILESTONES = [
  { dot: 'far', label: 'Junior PM', time: '0–3yr' },
  { dot: 'far', label: 'PM', time: '3–5yr' },
  { dot: 'now', label: 'Sr PM', time: 'You are here' },
  { dot: 'near', label: 'Staff / Lead PM', time: '~1–2yr' },
  { dot: 'mid', label: 'GPM / Director', time: '~3–4yr' },
  { dot: 'far', label: 'VP Product', time: '~6–8yr' },
  { dot: 'far', label: 'CPO / Founder', time: '10yr+' },
];

export default function CandTrajectory() {
  const { navigate, showToast } = useApp();
  const { profile } = useAuth();
  const [selectedPath, setSelectedPath] = useState('a');

  return (
    <div className="scroll">
      <div className="review-shell" style={{ maxWidth: 820 }}>
        <div className="page-hdr" style={{ maxWidth: 820, marginBottom: 18 }}>
          <div>
            <div className="eyebrow">Forward-looking match intelligence</div>
            <div className="page-title">Career Trajectory</div>
            <div className="page-sub">Not just the right role for now — the right arc for where you&apos;re going. Based on your Work DNA, skills profile, and patterns from 2,400+ similar career paths on Hiro.</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => showToast('Trajectory exported as PDF', 'success')}>Export →</button>
        </div>

        {/* Hero */}
        <div className="traj-hero">
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(56,189,248,.8)', marginBottom: 8 }}>{profile?.full_name || 'Jordan Mitchell'} · {profile?.job_title || 'Sr PM'} · 7yr exp</div>
            <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 6 }}>3 paths people like you typically take</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', maxWidth: 520, lineHeight: 1.7, marginBottom: 16 }}>Built from your Work DNA (The Strategist), skills fingerprint, and the actual career trajectories of 2,400+ fintech PMs who passed through Hiro. Updated as you grow.</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="chip chip-c">🧬 The Strategist</span>
              <span className="chip chip-v">7yr · Sr PM</span>
              <span className="chip chip-g">Fintech · Payments</span>
              <span className="chip chip-x">Async-first</span>
              <span className="chip chip-x">Data-driven</span>
            </div>
          </div>
        </div>

        {/* Milestone bar */}
        <div className="card" style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--text3)', marginBottom: 14 }}>Your position on the arc</div>
          <div className="milestone-row">
            {MILESTONES.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                <div className="ms-item">
                  <div className={`ms-dot ${m.dot}`}>{m.dot === 'now' ? '★' : m.dot === 'near' ? '↑' : m.dot === 'mid' ? '→' : m.label.substring(0, 2)}</div>
                  <div className="ms-label">{m.label}</div>
                  <div className="ms-time">{m.time}</div>
                </div>
                {i < MILESTONES.length - 1 && <div className="ms-line" />}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', padding: '10px 12px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border2)' }}>
            Based on similar profiles, the next natural move is <strong style={{ color: 'var(--cyan)' }}>Staff PM or Group PM</strong> within 12–18 months — or an early VP at a Series A where you can expand scope faster.
          </div>
        </div>

        {/* 3 path cards */}
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--text3)', marginBottom: 12 }}>Choose your path — Hiro re-weights your matches accordingly</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
          {Object.values(PATHS).map(p => (
            <div key={p.id} className={`path-card path-${p.id}${selectedPath === p.id ? ' selected' : ''}`} onClick={() => setSelectedPath(p.id)} style={{ cursor: 'pointer' }}>
              <div className={`path-glow-${p.id}`} />
              <div className="path-icon">{p.icon}</div>
              <div className="path-title" style={{ color: p.color }}>{p.title}</div>
              <div className="path-time" style={{ background: p.timeBg, border: `1px solid ${p.timeBorder}`, color: p.color }}>{p.time}</div>
              <div className="path-desc">{p.desc}</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
                {p.chips.map(([cls, label]) => <span key={label} className={`chip ${cls}`} style={{ fontSize: 10 }}>{label}</span>)}
              </div>
            </div>
          ))}
        </div>

        {/* Path detail */}
        <div className="g2">
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: PATHS[selectedPath].color, marginBottom: 12 }}>🎯 Matches aligned to {PATHS[selectedPath].title}</div>
            {[
              { emoji: '🏦', title: 'Sr PM — Payments', sub: 'Monzo · Series C · VP track in 3yr', fit: '94%', dna: '91%' },
              { emoji: '⚡', title: 'Head of Product — Growth', sub: 'Volt · Series B · First PM hire', fit: '89%', dna: '87%' },
              { emoji: '🧠', title: 'PM — AI Products', sub: 'Synthesia · Series C · Fast growth track', fit: '88%', dna: '83%' },
            ].map((m, i) => (
              <div key={i} className="match-for-path" onClick={() => navigate('cand-jobs')} style={{ cursor: 'pointer' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(14,17,36,.9)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{m.emoji}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 700 }}>{m.title}</div><div style={{ fontSize: 12, color: 'var(--text2)' }}>{m.sub}</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontSize: 12, fontWeight: 800, color: 'var(--green)' }}>{m.fit}</div><div style={{ fontSize: 10, color: '#f9a8d4' }}>🧬 {m.dna}</div></div>
              </div>
            ))}
          </div>

          <div>
            <div className="traj-insight" style={{ border: '1px solid rgba(56,189,248,.25)', background: 'rgba(56,189,248,.06)', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--cyan)', marginBottom: 8 }}>🔮 Trajectory insight</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Of 847 Strategist-archetype PMs who chose this path on Hiro, <strong style={{ color: 'var(--cyan)' }}>73% reached VP or equivalent within 5 years</strong>. Median comp at that level: <strong style={{ color: 'var(--cyan)' }}>£185k + equity</strong>.</div>
            </div>
            <div className="traj-insight" style={{ border: '1px solid rgba(245,158,11,.2)', background: 'rgba(245,158,11,.06)', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--amber)', marginBottom: 8 }}>⚡ Skills to add for this path</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>Your current profile is strong for this path. Two gaps compared to successful fast-trackers:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ color: 'var(--amber)' }}>↑</span><span style={{ color: 'var(--text2)' }}><strong>GTM / growth loops</strong> — 68% of fast-trackers have this</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ color: 'var(--amber)' }}>↑</span><span style={{ color: 'var(--text2)' }}><strong>Team leadership</strong> — managing PMs unlocks VP candidacy</span></div>
              </div>
            </div>
            <div className="card2">
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text3)', marginBottom: 8 }}>Companies where this path thrives</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['Monzo', 'Revolut', 'Wise', 'Volt', 'Primer', 'Stripe', 'Checkout.com'].map(c => (
                  <span key={c} className="chip chip-c">{c}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
