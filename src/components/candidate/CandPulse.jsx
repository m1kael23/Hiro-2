import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { notifyPulseDrift, checkAndNotifyPulseDue } from '../../services/notificationService';

const QUESTIONS = [
  { n: 1, text: 'Right now, how much are you growing in this role?',
    options: ['📈 A lot — this role is stretching me in the right ways','📊 Moderately — some growth, some plateauing','🔄 Barely — I\'ve mastered most of this role','📉 Not really — I feel stuck'],
    dim: 'growth', scores: [1, 0.67, 0.33, 0] },
  { n: 2, text: 'How much ownership do you have over the work that matters?',
    options: ['🦅 Full ownership — I set direction and execute','🤝 Good balance — clear scope, some autonomy','👀 Supervised — more sign-off than I\'d like','🔒 Constrained — I execute others\' decisions'],
    dim: 'autonomy', scores: [1, 0.67, 0.33, 0] },
  { n: 3, text: 'Does how your team actually works match your Work DNA?',
    options: ['🧬 Strong match — the culture fits how I naturally work','⚖️ Mostly — a few friction points but manageable','🌀 Some tension — I\'m adapting more than I\'d like','❌ Mismatch — the way we work drains me'],
    dim: 'culture_fit', scores: [1, 0.67, 0.33, 0] },
  { n: 4, text: 'Is this role moving you toward where you want to be in 3 years?',
    options: ['🚀 Definitely — this role is building the right foundation','🧭 Roughly — mostly aligned, could be more intentional','↔️ Sideways — not moving backward but not progressing','⬇️ No — this role is pulling me off track'],
    dim: 'trajectory', scores: [1, 0.67, 0.33, 0] },
  { n: 5, text: 'If you could change one thing about your current role right now, what would it be?',
    options: ['💰 Compensation — I\'m being paid below my value','🚀 Scope — I want more ownership and responsibility','🤝 Team — the people or culture aren\'t the right fit','🧭 Direction — I\'m not sure this is the right company for my goals','✨ Nothing — I\'m genuinely in a good place'],
    dim: 'comp_satisfaction', scores: [0, 0.25, 0.25, 0.25, 1] },
];

// Health score formula from legal doc:
// H = 0.40*rolefit + 0.30*culturefit + 0.20*growthsignal + 0.10*compsatisfaction
// We map: rolefit = avg(growth+trajectory+autonomy), culturefit = culture_fit, etc.
function computeHealthScore(answers) {
  const get = (dim) => {
    const q = QUESTIONS.find(q => q.dim === dim);
    if (!q || answers[q.n] === undefined) return 0.5;
    const idx = q.options.indexOf(answers[q.n]);
    return idx >= 0 ? q.scores[idx] : 0.5;
  };
  const rolefit   = (get('growth') + get('trajectory') + get('autonomy')) / 3;
  const culturefit = get('culture_fit');
  const growth    = get('growth');
  const comp      = get('comp_satisfaction');
  const raw = 0.40 * rolefit + 0.30 * culturefit + 0.20 * growth + 0.10 * comp;
  return Math.round(raw * 100);
}

function getDriftDimension(answers) {
  const dimScores = QUESTIONS.map(q => {
    const idx = q.options.indexOf(answers[q.n]);
    return { dim: q.dim, score: idx >= 0 ? q.scores[idx] : 0.5 };
  });
  const lowest = dimScores.reduce((a, b) => a.score < b.score ? a : b);
  const labels = {
    growth: 'Growth',
    autonomy: 'Autonomy',
    culture_fit: 'Culture / DNA fit',
    trajectory: 'Trajectory alignment',
    comp_satisfaction: 'Compensation satisfaction',
  };
  return labels[lowest.dim] || lowest.dim;
}

const DIMS = [
  { icon: 'ico-rocket',  label: 'Growth',               dim: 'growth',           color: '#22c55e', grad: 'linear-gradient(90deg,#22c55e,#0d9488)' },
  { icon: 'ico-compass', label: 'Autonomy',              dim: 'autonomy',         color: '#22c55e', grad: 'linear-gradient(90deg,#22c55e,#0d9488)' },
  { icon: 'ico-users',   label: 'Team fit',              dim: 'culture_fit',      color: 'var(--cyan)', grad: 'linear-gradient(90deg,#38bdf8,#6c47ff)' },
  { icon: 'ico-coin',    label: 'Comp satisfaction',     dim: 'comp_satisfaction',color: 'var(--cyan)', grad: 'linear-gradient(90deg,#38bdf8,#6c47ff)' },
  { icon: 'ico-compass', label: 'Trajectory alignment',  dim: 'trajectory',       color: 'var(--amber)',grad: 'linear-gradient(90deg,#f59e0b,#f97316)' },
];

export default function CandPulse() {
  const { navigate, showToast } = useApp();
  const { profile, updateProfile } = useAuth();
  const [started, setStarted]   = useState(false);
  const [answers, setAnswers]   = useState({});
  const [done, setDone]         = useState(false);
  const [saving, setSaving]     = useState(false);
  const [history, setHistory]   = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const answeredCount = Object.keys(answers).length;
  const allDone = answeredCount === QUESTIONS.length;

  // ── Load pulse history from Firestore ──────────────────────────────────────
  useEffect(() => {
    if (!profile?.id) return;
    const loadHistory = async () => {
      try {
        const q = query(
          collection(db, 'pulses'),
          where('candidateId', '==', profile.id),
          orderBy('createdAt', 'desc'),
          limit(8)
        );
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setHistory(docs);
      } catch (err) {
        console.error('[CandPulse] load history failed:', err);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();
  }, [profile?.id]);

  // ── Check if pulse due notification should fire ─────────────────────────────
  useEffect(() => {
    if (profile?.id) {
      checkAndNotifyPulseDue(profile, updateProfile);
    }
  }, [profile?.id]);

  const answer = (qn, opt) => setAnswers(p => ({ ...p, [qn]: opt }));

  // ── Submit pulse: save to Firestore + fire drift notification ───────────────
  const submitPulse = async () => {
    if (!profile?.id || !allDone) return;
    setSaving(true);
    try {
      const healthScore = computeHealthScore(answers);
      const driftDimension = getDriftDimension(answers);

      // Save pulse document
      const pulseData = {
        candidateId: profile.id,
        answers,
        healthScore,
        createdAt: serverTimestamp(),
        // Dimension breakdown
        dimensions: QUESTIONS.reduce((acc, q) => {
          const idx = q.options.indexOf(answers[q.n]);
          acc[q.dim] = idx >= 0 ? Math.round(q.scores[idx] * 100) : 50;
          return acc;
        }, {}),
      };
      await addDoc(collection(db, 'pulses'), pulseData);

      // Update profile with lastPulseAt + latest score
      await updateProfile({
        lastPulseAt: serverTimestamp(),
        lastPulseScore: healthScore,
      });

      // Fire drift notification if previous score exists
      const prevScore = profile.lastPulseScore ?? null;
      if (prevScore !== null) {
        await notifyPulseDrift({
          candidateId: profile.id,
          previousScore: prevScore,
          currentScore: healthScore,
          driftDimension,
        });
      }

      setDone(true);
      showToast('Pulse recorded 💓', 'success');
    } catch (err) {
      console.error('[CandPulse] submit failed:', err);
      showToast('Failed to save pulse — try again', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Derive display values ───────────────────────────────────────────────────
  const latestScore    = history[0]?.healthScore ?? profile?.lastPulseScore ?? null;
  const previousScore  = history[1]?.healthScore ?? null;
  const drift = latestScore !== null && previousScore !== null ? latestScore - previousScore : null;

  const daysUntilNextPulse = (() => {
    if (!profile?.lastPulseAt) return null;
    const last = profile.lastPulseAt?.toDate?.();
    if (!last) return null;
    const days = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 90 - days);
  })();

  const dimDisplayValues = DIMS.map(d => {
    const latestPulse = history[0];
    const val = latestPulse?.dimensions?.[d.dim] ?? null;
    return { ...d, val: val ?? 70 };
  });

  const healthLabel = !latestScore ? 'No data yet'
    : latestScore >= 80 ? 'strong place'
    : latestScore >= 65 ? 'steady place'
    : latestScore >= 50 ? 'mixed signals'
    : 'worth watching';

  return (
    <div className="scroll">
      <div className="review-shell" style={{ maxWidth: 760 }}>
        <div className="page-hdr" style={{ maxWidth: 760, marginBottom: 18 }}>
          <div>
            <div className="eyebrow">Every 90 days · private to you</div>
            <div className="page-title">Career Pulse</div>
            <div className="page-sub">How are you actually doing? Not your CV. Not your job title. Hiro checks in every 90 days so you never drift without noticing.</div>
          </div>
          {daysUntilNextPulse !== null && (
            <span className="chip chip-p" style={{ fontSize: 12, padding: '5px 12px' }}>
              {daysUntilNextPulse === 0 ? 'Pulse due now' : `Next pulse in ${daysUntilNextPulse} days`}
            </span>
          )}
        </div>

        {/* Hero ring */}
        <div className="pulse-hero">
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(236,72,153,.8)', marginBottom: 8 }}>
                {profile?.full_name || 'You'} · Career health
              </div>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 6 }}>
                {latestScore ? <>You&apos;re in a <span style={{ color: '#ec4899' }}>{healthLabel}</span> right now</> : 'Take your first pulse to see your career health'}
              </div>
              {drift !== null && (
                <div style={{ fontSize: 13, color: drift >= 0 ? 'var(--green)' : 'var(--amber)', marginBottom: 8, fontWeight: 600 }}>
                  {drift >= 0 ? `↑ +${drift} pts` : `↓ ${drift} pts`} since last pulse
                </div>
              )}
              {history.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36, marginBottom: 14 }}>
                  {[...history].reverse().slice(-7).map((p, i) => (
                    <div key={p.id} style={{ flex: 1, background: `rgba(236,72,153,${0.2 + (p.healthScore / 100) * 0.6})`, borderRadius: '3px 3px 0 0', height: `${p.healthScore}%` }} />
                  ))}
                </div>
              )}
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>{history.length} pulses recorded</div>
            </div>
            <div className="health-ring" style={{ width: 108, height: 108, position: 'relative', flexShrink: 0 }}>
              <svg width="108" height="108" viewBox="0 0 108 108">
                <defs>
                  <linearGradient id="pulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
                <circle cx="54" cy="54" r="46" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="9" />
                <circle
                  cx="54" cy="54" r="46" fill="none"
                  stroke="url(#pulseGrad)" strokeWidth="9" strokeLinecap="round"
                  strokeDasharray="289.0"
                  strokeDashoffset={latestScore ? 289 * (1 - latestScore / 100) : 289}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                  {latestScore ?? '—'}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>/100</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dimension breakdown */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--text3)', marginBottom: 14 }}>Health by dimension · latest pulse</div>
          {dimDisplayValues.map(d => (
            <div key={d.label} className="dim-health-row">
              <span className={`ico ${d.icon}`} style={{ width: 14, height: 14, background: 'var(--text2)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, flex: '0 0 170px' }}>{d.label}</span>
              <div className="dim-health-bar">
                <div className="dim-health-fill" style={{ width: `${d.val}%`, background: d.grad }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: d.color, width: 32, textAlign: 'right' }}>{d.val}</span>
            </div>
          ))}
        </div>

        {/* Drift nudges — only if real drift */}
        {drift !== null && drift <= -10 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--amber)', marginBottom: 10 }}>⚠ Hiro noticed something</div>
            <div
              className="pulse-nudge"
              style={{ borderColor: 'rgba(245,158,11,.3)', background: 'rgba(245,158,11,.06)', cursor: 'pointer' }}
              onClick={() => navigate('cand-trajectory')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>🧭</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Your score has dropped {Math.abs(drift)} points since last pulse</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Consider reviewing your trajectory or joining The Bench so the right opportunity can find you.</div>
                </div>
                <span style={{ color: 'var(--amber)', fontSize: 16, flexShrink: 0 }}>→</span>
              </div>
            </div>
          </div>
        )}

        {/* History from Firestore */}
        {!loadingHistory && history.length > 0 && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--text3)', marginBottom: 12 }}>Pulse history</div>
            {history.map((p, i) => {
              const d = p.createdAt?.toDate?.();
              const label = d ? d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'Recent';
              const prev = history[i + 1]?.healthScore;
              const delta = prev !== undefined ? p.healthScore - prev : null;
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', ...(i < history.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,.05)' } : {}) }}>
                  <div className="pulse-history-dot" style={{ background: 'rgba(236,72,153,0.8)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                      Score: {p.healthScore}
                      {delta !== null && (
                        <span style={{ marginLeft: 6, color: delta >= 0 ? 'var(--green)' : 'var(--amber)' }}>
                          {delta >= 0 ? `+${delta}` : delta}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 16, fontWeight: 800, color: 'rgba(236,72,153,0.8)' }}>{p.healthScore}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Pulse CTA / form */}
        {!started && !done && (
          <button
            className="btn btn-violet btn-sm"
            style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 14 }}
            onClick={() => setStarted(true)}
          >
            💓 Take your pulse — 90 seconds →
          </button>
        )}

        {started && !done && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: '#ec4899', marginBottom: 14 }}>💓 Pulse check</div>
            {QUESTIONS.map(q => (
              <div
                key={q.n}
                className={`pulse-q-card${answers[q.n] ? '' : answeredCount + 1 === q.n ? ' active' : ''}`}
                style={answeredCount < q.n - 1 ? { opacity: 0.5 } : {}}
              >
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(236,72,153,.7)', marginBottom: 8 }}>{q.n} of {QUESTIONS.length}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14, lineHeight: 1.5 }}>{q.text}</div>
                {q.options.map(opt => (
                  <div
                    key={opt}
                    className={`pulse-option${answers[q.n] === opt ? ' selected' : ''}`}
                    onClick={() => answer(q.n, opt)}
                    style={{ cursor: 'pointer' }}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            ))}
            <button
              className="btn btn-violet btn-sm"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
              disabled={!allDone || saving}
              onClick={submitPulse}
            >
              {saving ? 'Saving…' : 'Submit pulse →'}
            </button>
          </div>
        )}

        {done && (
          <div style={{ textAlign: 'center', padding: '32px 24px', borderRadius: 'var(--rl)', border: '2px solid rgba(236,72,153,.3)', background: 'rgba(236,72,153,.06)' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>💓</div>
            <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Pulse recorded</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', marginBottom: 16, maxWidth: 380, margin: '0 auto 16px' }}>Your health score has been updated and your trend is live. See you in 90 days.</div>
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
