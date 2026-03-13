/**
 * CandBlindMatches.jsx — Candidate-side double-blind matching UI
 *
 * Shows:
 *   - Pending signals from employers (phase 2 — employer interested, waiting on candidate)
 *   - Mutual matches (phase 3 — both sides revealed, thread exists)
 *   - How the privacy system works (education card for new users)
 *
 * Candidate sees company name + role but NO employer contact until they accept.
 * On Accept → BlindMatchContext.acceptSignal() → status = 'mutual' → thread created.
 */

import { useState } from 'react';
import { useBlindMatch } from '../../context/BlindMatchContext';
import { useApp }        from '../../context/AppContext';

/* ── DNA mini-bars ──────────────────────────────────────────────── */
// Must match DNA_DIMENSIONS order in dnaEngine.js exactly:
// 0-Energy, 1-Decision, 2-Feedback, 3-Rhythm, 4-Autonomy, 5-Risk, 6-Growth
const DNA_LABELS = ['Energy', 'Decision', 'Feedback', 'Rhythm', 'Autonomy', 'Risk', 'Growth'];
function DnaBars({ vector = [] }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 28 }}>
      {DNA_LABELS.map((lbl, i) => {
        const h = Math.round(4 + ((vector[i] ?? 50) / 100) * 20);
        return (
          <div key={lbl} title={`${lbl}: ${vector[i] ?? 50}`}
            style={{ width: 8, height: h, borderRadius: 3,
              background: 'linear-gradient(180deg, #a78bfa, #6c47ff)', opacity: .85 }}/>
        );
      })}
    </div>
  );
}

/* ── Score ring ─────────────────────────────────────────────────── */
function ScoreRing({ score, size = 52 }) {
  const r    = (size / 2) - 4;
  const circ = 2 * Math.PI * r;
  const fill = circ * Math.min(score, 100) / 100;
  const col  = score >= 85 ? 'var(--green)' : score >= 70 ? '#2dd4bf'
             : score >= 55 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="rgba(255,255,255,.08)" strokeWidth={5}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={col} strokeWidth={5}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"/>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Manrope,sans-serif', fontSize: 12, fontWeight: 800, color: col }}>
        {score}%
      </div>
    </div>
  );
}

/* ── Signal card (phase 2 — employer sent interest) ─────────────── */
function SignalCard({ signal, onAccept, onDecline, busy }) {
  const [deciding, setDeciding] = useState(false);

  const signalDate = signal.signalledAt?.toDate
    ? signal.signalledAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : 'Recently';

  async function handleAccept() {
    setDeciding(true);
    try { await onAccept(signal.matchId); }
    finally { setDeciding(false); }
  }
  async function handleDecline() {
    setDeciding(true);
    try { await onDecline(signal.matchId); }
    finally { setDeciding(false); }
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid rgba(13,148,136,.35)',
      borderRadius: 14,
      padding: '18px 20px',
      marginBottom: 10,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Teal glow accent */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(13,148,136,.15), transparent 70%)',
        pointerEvents: 'none' }}/>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(13,148,136,.3), rgba(45,212,191,.15))',
              border: '1px solid rgba(45,212,191,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>🏢</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                {signal.companyName}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                {signal.jobTitle}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <ScoreRing score={signal.dnaScore ?? 0}/>
            <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '.08em' }}>DNA match</span>
          </div>
        </div>

        {/* Privacy notice */}
        <div style={{
          background: 'rgba(13,148,136,.08)', border: '1px solid rgba(45,212,191,.2)',
          borderRadius: 8, padding: '8px 12px', fontSize: 12,
          color: 'var(--text2)', marginBottom: 14, lineHeight: 1.5,
        }}>
          🔒 <strong style={{ color: '#2dd4bf' }}>Your identity is still private.</strong> They
          matched your DNA profile — they haven't seen your name or CV yet. Accept to reveal both profiles
          and open a conversation.
        </div>

        {/* Signal meta */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
            background: 'rgba(13,148,136,.12)', border: '1px solid rgba(45,212,191,.25)', color: '#2dd4bf' }}>
            🧬 Matched on Work DNA
          </span>
          <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
            background: 'rgba(255,255,255,.05)', border: '1px solid var(--border2)', color: 'var(--text2)' }}>
            📅 Signalled {signalDate}
          </span>
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleAccept}
            disabled={deciding || busy}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: deciding ? 'rgba(13,148,136,.3)' : 'linear-gradient(135deg, #0d9488, #0f766e)',
              color: '#fff', fontWeight: 700, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: deciding ? .7 : 1, transition: 'opacity .15s',
            }}
          >
            {deciding ? (
              <><div style={{ width: 14, height: 14, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff',
                animation: 'spin .7s linear infinite' }}/> Opening…</>
            ) : '✅ Accept & reveal'}
          </button>
          <button
            onClick={handleDecline}
            disabled={deciding || busy}
            style={{
              padding: '10px 18px', borderRadius: 999,
              border: '1px solid var(--border2)',
              background: 'rgba(255,255,255,.04)',
              color: 'var(--text2)', fontWeight: 600, fontSize: 13,
              cursor: 'pointer', opacity: deciding ? .5 : 1, transition: 'opacity .15s',
            }}
          >
            Pass
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Mutual match card (phase 3 — revealed) ──────────────────────── */
function MutualCard({ match, onMessage }) {
  const revealedDate = match.revealedAt?.toDate
    ? match.revealedAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '16px 18px', marginBottom: 8,
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 11,
        background: 'linear-gradient(135deg, var(--violet-lt), rgba(45,212,191,.1))',
        border: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flexShrink: 0,
      }}>🧬</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 1 }}>
          {match.companyName}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>
          {match.jobTitle}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
            background: 'var(--green-lt)', border: '1px solid rgba(34,197,94,.3)', color: 'var(--green)' }}>
            ✓ Mutual match
          </span>
          {revealedDate && (
            <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11,
              background: 'rgba(255,255,255,.05)', border: '1px solid var(--border2)', color: 'var(--text3)' }}>
              Revealed {revealedDate}
            </span>
          )}
          {match.dnaScore && (
            <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
              background: 'var(--violet-lt)', border: '1px solid var(--border2)', color: '#a78bfa' }}>
              {match.dnaScore}% DNA fit
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => onMessage(match)}
        style={{
          padding: '8px 16px', borderRadius: 999,
          background: 'linear-gradient(135deg, var(--violet), #4338ca)',
          color: '#fff', fontWeight: 700, fontSize: 13,
          border: 'none', cursor: 'pointer', flexShrink: 0,
          boxShadow: '0 4px 14px rgba(108,71,255,.3)',
        }}
      >
        Message →
      </button>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────── */
function EmptyState({ title, sub, icon }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text2)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>{sub}</div>
    </div>
  );
}

/* ── Main view ───────────────────────────────────────────────────── */
export default function CandBlindMatches() {
  const { pendingSignals, mutualMatches, loading, acceptSignal, declineSignal } = useBlindMatch();
  const { navigate, showToast } = useApp();
  const [busy, setBusy] = useState(false);
  const [tab, setTab]   = useState('signals');

  async function handleAccept(matchId) {
    setBusy(true);
    try {
      await acceptSignal(matchId);
      showToast('Match revealed — conversation opened in Messages 🎉', 'success');
      setTimeout(() => navigate('cand-messages'), 800);
    } catch {
      showToast('Something went wrong — please try again', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleDecline(matchId) {
    setBusy(true);
    try {
      await declineSignal(matchId);
      showToast('Signal declined', 'default');
    } catch {
      showToast('Something went wrong — please try again', 'error');
    } finally {
      setBusy(false);
    }
  }

  function handleMessage(match) {
    navigate('cand-messages');
  }

  const signalCount = pendingSignals.length;
  const mutualCount = mutualMatches.length;

  if (loading) {
    return (
      <div className="view scroll" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-sm" style={{ width: 28, height: 28, borderWidth: 3 }}/>
      </div>
    );
  }

  return (
    <div className="view scroll">
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* ── Page header ──────────────────────────────────────── */}
        <div className="page-hdr" style={{ marginBottom: 20 }}>
          <div>
            <div className="eyebrow">Private Matching</div>
            <div className="page-title">Your blind matches</div>
            <div className="page-sub">
              Companies matched your DNA profile — they haven't seen your name yet.
            </div>
          </div>
          <div style={{
            display: 'flex', gap: 6, alignItems: 'center',
            padding: '6px 12px', borderRadius: 999,
            background: 'rgba(13,148,136,.1)', border: '1px solid rgba(45,212,191,.25)',
            fontSize: 12, fontWeight: 600, color: '#2dd4bf',
          }}>
            🔒 Stealth active
          </div>
        </div>

        {/* ── How it works banner ──────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(108,71,255,.08), rgba(13,148,136,.06))',
          border: '1px solid rgba(108,71,255,.2)',
          borderRadius: 14, padding: '16px 20px', marginBottom: 20,
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>🧬 How double-blind matching works</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { step: '1', label: 'DNA match', desc: 'Algorithm matches your Work DNA to employer team — no names exchanged', color: 'var(--violet)', bg: 'var(--violet-lt)' },
              { step: '2', label: 'Signal', desc: 'Employer signals interest — you see company + role but they still can\'t see your CV', color: '#2dd4bf', bg: 'rgba(13,148,136,.12)' },
              { step: '3', label: 'Mutual reveal', desc: 'You accept → both profiles fully unlock + messaging thread opens automatically', color: 'var(--green)', bg: 'var(--green-lt)' },
            ].map(s => (
              <div key={s.step} style={{
                background: s.bg, border: `1px solid ${s.color}33`,
                borderRadius: 10, padding: '10px 12px',
              }}>
                <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 18, fontWeight: 800,
                  color: s.color, marginBottom: 4 }}>{s.step}</div>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div className="tab-strip">
          <button className={`tab-btn ${tab === 'signals' ? 'active' : ''}`}
            onClick={() => setTab('signals')}>
            Pending signals
            {signalCount > 0 && (
              <span style={{ marginLeft: 6, background: '#2dd4bf', color: '#000',
                fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 999 }}>
                {signalCount}
              </span>
            )}
          </button>
          <button className={`tab-btn ${tab === 'mutual' ? 'active' : ''}`}
            onClick={() => setTab('mutual')}>
            Mutual matches
            {mutualCount > 0 && (
              <span style={{ marginLeft: 6, background: 'var(--green)', color: '#000',
                fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 999 }}>
                {mutualCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Signals tab ──────────────────────────────────────── */}
        {tab === 'signals' && (
          <>
            {signalCount === 0 ? (
              <EmptyState
                icon="📭"
                title="No pending signals"
                sub="When an employer matches your DNA profile and signals interest, it will appear here. Keep your Work DNA up to date to improve match quality."
              />
            ) : (
              pendingSignals.map(signal => (
                <SignalCard
                  key={signal.matchId}
                  signal={signal}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  busy={busy}
                />
              ))
            )}
          </>
        )}

        {/* ── Mutual tab ───────────────────────────────────────── */}
        {tab === 'mutual' && (
          <>
            {mutualCount === 0 ? (
              <EmptyState
                icon="🤝"
                title="No mutual matches yet"
                sub="Once you accept an employer signal, both profiles reveal and the match moves here. A messaging thread opens automatically."
              />
            ) : (
              mutualMatches.map(match => (
                <MutualCard
                  key={match.id}
                  match={match}
                  onMessage={handleMessage}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
