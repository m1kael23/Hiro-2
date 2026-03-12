import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

const QUESTIONS = [
  { n: 1, text: 'Right now, how much are you growing in this role?', options: ['📈 A lot — this role is stretching me in the right ways', '📊 Moderately — some growth, some plateauing', '🔄 Barely — I&apos;ve mastered most of this role', '📉 Not really — I feel stuck'] },
  { n: 2, text: 'How much ownership do you have over the work that matters?', options: ['🦅 Full ownership — I set direction and execute', '🤝 Good balance — clear scope, some autonomy', '👀 Supervised — more sign-off than I&apos;d like', '🔒 Constrained — I execute others&apos; decisions'] },
  { n: 3, text: 'Does how your team actually works match your Work DNA?', options: ['🧬 Strong match — the culture fits how I naturally work', '⚖️ Mostly — a few friction points but manageable', '🌀 Some tension — I&apos;m adapting more than I&apos;d like', '❌ Mismatch — the way we work drains me'] },
  { n: 4, text: 'Is this role moving you toward where you want to be in 3 years?', options: ['🚀 Definitely — this role is building the right foundation', '🧭 Roughly — mostly aligned, could be more intentional', '↔️ Sideways — not moving backward but not progressing', '⬇️ No — this role is pulling me off track'] },
  { n: 5, text: 'If you could change one thing about your current role right now, what would it be?', options: ['💰 Compensation — I&apos;m being paid below my value', '🚀 Scope — I want more ownership and responsibility', '🤝 Team — the people or culture aren&apos;t the right fit', '🧭 Direction — I&apos;m not sure this is the right company for my goals', '✨ Nothing — I&apos;m genuinely in a good place'] },
];

const DIMS = [
  { icon: 'ico-rocket', label: 'Growth', val: 88, color: '#22c55e', grad: 'linear-gradient(90deg,#22c55e,#0d9488)' },
  { icon: 'ico-compass', label: 'Autonomy', val: 82, color: '#22c55e', grad: 'linear-gradient(90deg,#22c55e,#0d9488)' },
  { icon: 'ico-users', label: 'Team fit', val: 76, color: 'var(--cyan)', grad: 'linear-gradient(90deg,#38bdf8,#6c47ff)' },
  { icon: 'ico-coin', label: 'Comp satisfaction', val: 74, color: 'var(--cyan)', grad: 'linear-gradient(90deg,#38bdf8,#6c47ff)' },
  { icon: 'ico-compass', label: 'Trajectory alignment', val: 58, color: 'var(--amber)', grad: 'linear-gradient(90deg,#f59e0b,#f97316)' },
  { icon: 'ico-dna', label: 'Culture / DNA fit', val: 71, color: 'var(--cyan)', grad: 'linear-gradient(90deg,#38bdf8,#6c47ff)', iconColor: '#f9a8d4' },
];

export default function CandPulse() {
  const { navigate } = useApp();
  const { profile } = useAuth();
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const allDone = answeredCount === QUESTIONS.length;

  const answer = (qn, opt) => {
    setAnswers(p => ({ ...p, [qn]: opt }));
  };

  return (
    <div className="scroll">
      <div className="review-shell" style={{ maxWidth: 760 }}>
        <div className="page-hdr" style={{ maxWidth: 760, marginBottom: 18 }}>
          <div>
            <div className="eyebrow">Every 90 days · private to you</div>
            <div className="page-title">Career Pulse</div>
            <div className="page-sub">How are you actually doing? Not your CV. Not your job title. Hiro checks in every 90 days so you never drift without noticing.</div>
          </div>
          <span className="chip chip-p" style={{ fontSize: 12, padding: '5px 12px' }}>Next pulse due in 4 days</span>
        </div>

        {/* Hero ring */}
        <div className="pulse-hero">
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(236,72,153,.8)', marginBottom: 8 }}>{profile?.full_name || 'Jordan Mitchell'} · Career health</div>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 6 }}>You&apos;re in a <span style={{ color: '#ec4899' }}>strong place</span> right now</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', maxWidth: 420, lineHeight: 1.7, marginBottom: 14 }}>Growth and autonomy are high. One signal worth watching: alignment with your long-term trajectory has dipped slightly over the last two pulses.</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36, marginBottom: 14 }}>
                {[60, 70, 55, 75, 82, 72, 78].map((h, i) => (
                  <div key={i} style={{ flex: 1, background: `rgba(236,72,153,${0.25 + i * 0.05})`, borderRadius: '3px 3px 0 0', height: `${h}%` }} />
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>7 pulses · 18 months</div>
            </div>
            <div className="health-ring" style={{ width: 108, height: 108, position: 'relative', flexShrink: 0 }}>
              <svg width="108" height="108" viewBox="0 0 108 108">
                <defs><linearGradient id="pulseGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#ec4899" /><stop offset="100%" stopColor="#a78bfa" /></linearGradient></defs>
                <circle cx="54" cy="54" r="46" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="9" />
                <circle cx="54" cy="54" r="46" fill="none" stroke="url(#pulseGrad)" strokeWidth="9" strokeLinecap="round" strokeDasharray="289.0" strokeDashoffset="63.6" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1 }}>78</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>/100</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dimension breakdown */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--text3)', marginBottom: 14 }}>Health by dimension · latest pulse</div>
          {DIMS.map(d => (
            <div key={d.label} className="dim-health-row">
              <span className={`ico ${d.icon}`} style={{ width: 14, height: 14, background: d.iconColor || 'var(--text2)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, flex: '0 0 130px' }}>{d.label}</span>
              <div className="dim-health-bar"><div className="dim-health-fill" style={{ width: `${d.val}%`, background: d.grad }} /></div>
              <span style={{ fontSize: 12, fontWeight: 700, color: d.color, width: 32, textAlign: 'right' }}>{d.val}</span>
            </div>
          ))}
        </div>

        {/* Drift nudges */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--amber)', marginBottom: 10 }}>⚠ Hiro noticed something</div>
          {[
            { emoji: '🧭', title: 'Trajectory alignment has dropped 2 pulses in a row', sub: 'Your current role may be drifting from your "Fast track" path. 3 matches on your trajectory shortlist are active right now.', color: 'var(--amber)', border: 'rgba(245,158,11,.3)', bg: 'rgba(245,158,11,.06)', route: 'cand-trajectory' },
            { emoji: '🪑', title: 'Your comp satisfaction has been below 80 for 3 pulses', sub: 'Consider joining The Bench so the right opportunity can find you before you&apos;re ready to look. No commitment required.', color: 'var(--teal)', border: 'rgba(13,148,136,.25)', bg: 'rgba(13,148,136,.05)', route: 'cand-bench' },
          ].map((n, i) => (
            <div key={i} className="pulse-nudge" style={{ borderColor: n.border, background: n.bg, cursor: 'pointer' }} onClick={() => navigate(n.route)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{n.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{n.sub}</div>
                </div>
                <span style={{ color: n.color, fontSize: 16, flexShrink: 0 }}>→</span>
              </div>
            </div>
          ))}
        </div>

        {/* History */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--text3)', marginBottom: 12 }}>Pulse history</div>
          {[
            { month: 'March 2025', score: 78, note: 'Trajectory dip flagged', opacity: 1 },
            { month: 'December 2024', score: 82, note: 'All dimensions healthy', opacity: 1 },
            { month: 'September 2024', score: 85, note: 'Peak — strong growth phase', opacity: 0.7 },
            { month: 'June 2024', score: 71, note: 'Post-hire settling-in dip', opacity: 0.5, last: true },
          ].map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', ...(p.last ? {} : { borderBottom: '1px solid rgba(255,255,255,.05)' }) }}>
              <div className="pulse-history-dot" style={{ background: `rgba(236,72,153,${p.opacity})` }} />
              <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{p.month}</div><div style={{ fontSize: 12, color: 'var(--text3)' }}>Score: {p.score} · {p.note}</div></div>
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 16, fontWeight: 800, color: `rgba(236,72,153,${p.opacity})` }}>{p.score}</span>
            </div>
          ))}
        </div>

        {/* Pulse CTA / form */}
        {!started && !done && (
          <div>
            <button className="btn btn-violet btn-sm" style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 14 }} onClick={() => setStarted(true)}>
              💓 Take your next pulse — 90 seconds →
            </button>
          </div>
        )}

        {started && !done && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: '#ec4899', marginBottom: 14 }}>💓 Pulse check · June 2025</div>
            {QUESTIONS.map(q => (
              <div key={q.n} className={`pulse-q-card${answers[q.n] ? '' : answeredCount + 1 === q.n ? ' active' : ''}`} style={answeredCount < q.n - 1 ? { opacity: 0.5 } : {}}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(236,72,153,.7)', marginBottom: 8 }}>{q.n} of {QUESTIONS.length}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14, lineHeight: 1.5 }}>{q.text}</div>
                {q.options.map(opt => (
                  <div key={opt} className={`pulse-option${answers[q.n] === opt ? ' selected' : ''}`} onClick={() => answer(q.n, opt)} style={{ cursor: 'pointer' }}>{opt}</div>
                ))}
              </div>
            ))}
            <button
              className="btn btn-violet btn-sm"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
              disabled={!allDone}
              onClick={() => setDone(true)}
            >Submit pulse →</button>
          </div>
        )}

        {done && (
          <div style={{ textAlign: 'center', padding: '32px 24px', borderRadius: 'var(--rl)', border: '2px solid rgba(236,72,153,.3)', background: 'rgba(236,72,153,.06)' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>💓</div>
            <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Pulse recorded</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', marginBottom: 16, maxWidth: 380, margin: '0 auto 16px' }}>Your new health score will be calculated and your trend updated. See you in 90 days — unless you want to check in sooner.</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('cand-trajectory')}>Review trajectory →</button>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('cand-bench')}>Check The Bench →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
