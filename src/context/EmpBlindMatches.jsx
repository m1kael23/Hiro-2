/**
 * EmpBlindMatches.jsx — Employer-side double-blind matching UI
 *
 * Employer sees ONLY:
 *   - Alias (e.g. "Swift Builder #4821")
 *   - Work DNA vector bars + archetype label
 *   - DNA match % ring
 *   - Experience level, city (no full address), skills
 *   - Job the match is for
 *
 * No name, no photo, no email, no LinkedIn — until candidate accepts.
 *
 * Actions:
 *   "Signal interest" → BlindMatchContext.signalInterest()
 *     → Candidate is notified, sees company name + role
 *     → Employer sees card move to "Awaiting candidate" state
 *
 * Once candidate accepts → card moves to Mutual tab, full profile unlocks.
 */

import { useState } from 'react';
import { useBlindMatch } from '../../context/BlindMatchContext';
import { useApp }        from '../../context/AppContext';

/* ── Design tokens ──────────────────────────────────────────────── */
const DNA_DIMS = [
  { key: 'Async',  left: 'Async',   right: 'Sync'       },
  { key: 'Direct', left: 'Direct',  right: 'Diplomatic' },
  { key: 'Data',   left: 'Data',    right: 'Instinct'   },
  { key: 'Maker',  left: 'Maker',   right: 'Manager'    },
  { key: 'Stable', left: 'Stable',  right: 'Dynamic'    },
];

/* ── Score ring ─────────────────────────────────────────────────── */
function ScoreRing({ score, size = 64 }) {
  const r    = (size / 2) - 5;
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
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 14, fontWeight: 800, color: col, lineHeight: 1 }}>
          {score}%
        </div>
        <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '.06em' }}>DNA</div>
      </div>
    </div>
  );
}

/* ── DNA mini-chart ─────────────────────────────────────────────── */
function DnaChart({ vector = [] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {DNA_DIMS.map((dim, i) => {
        const val = vector[i] ?? 50;
        return (
          <div key={dim.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 38, fontSize: 10, color: 'var(--text3)', fontWeight: 600,
              textAlign: 'right', flexShrink: 0 }}>{dim.left}</div>
            <div style={{ flex: 1, height: 4, borderRadius: 999,
              background: 'rgba(255,255,255,.08)', overflow: 'hidden', position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%',
                width: `${val}%`, borderRadius: 999,
                background: 'linear-gradient(90deg, var(--violet), #a78bfa)',
                transition: 'width .5s',
              }}/>
            </div>
            <div style={{ width: 38, fontSize: 10, color: 'var(--text3)',
              fontWeight: 600, flexShrink: 0 }}>{dim.right}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Blind match card ────────────────────────────────────────────── */
function BlindCard({ match, onSignal, busy }) {
  const [expanded, setExpanded] = useState(false);
  const [sending,  setSending]  = useState(false);

  const isSignalled = match.status === 'signalled';

  async function handleSignal() {
    if (isSignalled) return;
    setSending(true);
    try { await onSignal(match.matchId); }
    finally { setSending(false); }
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${isSignalled ? 'rgba(245,158,11,.3)' : 'var(--border)'}`,
      borderRadius: 14, overflow: 'hidden', marginBottom: 10,
      transition: 'border-color .2s',
    }}>
      {/* Main row */}
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>

          {/* Avatar — deliberately generic, no photo */}
          <div style={{
            width: 44, height: 44, borderRadius: 11, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--violet-lt), rgba(108,71,255,.2))',
            border: '1px solid var(--border2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: 'var(--violet)',
          }}>
            {match.alias?.charAt(0) ?? '?'}
          </div>

          {/* Alias + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <div style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 800, fontSize: 15 }}>
                {match.alias}
              </div>
              {isSignalled && (
                <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                  background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.3)',
                  color: 'var(--amber)' }}>
                  ⏳ Awaiting candidate
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {match.archetype && (
                <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: 'var(--violet-lt)', border: '1px solid var(--border2)', color: '#a78bfa' }}>
                  🧬 {match.archetype}
                </span>
              )}
              {match.experienceYears && (
                <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11,
                  background: 'rgba(255,255,255,.05)', border: '1px solid var(--border2)', color: 'var(--text2)' }}>
                  {match.experienceYears}
                </span>
              )}
              {match.locationCity && (
                <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11,
                  background: 'rgba(255,255,255,.05)', border: '1px solid var(--border2)', color: 'var(--text2)' }}>
                  📍 {match.locationCity} area
                </span>
              )}
            </div>

            {/* Skills (no name context) */}
            {match.skills?.length > 0 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {match.skills.slice(0, 5).map(s => (
                  <span key={s} style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11,
                    background: 'rgba(255,255,255,.05)', border: '1px solid var(--border2)',
                    color: 'var(--text3)' }}>{s}</span>
                ))}
                {match.skills.length > 5 && (
                  <span style={{ fontSize: 11, color: 'var(--text3)', padding: '2px 4px' }}>
                    +{match.skills.length - 5}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Score + expand */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <ScoreRing score={match.dnaScore ?? 0}/>
            <button
              onClick={() => setExpanded(e => !e)}
              style={{ fontSize: 11, color: 'var(--text3)', background: 'none', border: 'none',
                cursor: 'pointer', padding: '2px 6px', borderRadius: 6,
                transition: 'color .15s' }}
            >
              {expanded ? '▲ Less' : '▼ DNA'}
            </button>
          </div>
        </div>

        {/* Expanded DNA chart */}
        {expanded && (
          <div style={{ marginTop: 14, paddingTop: 14,
            borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.12em', color: 'var(--text3)', marginBottom: 10 }}>
              Work DNA vector
            </div>
            <DnaChart vector={match.dnaVector}/>
          </div>
        )}

        {/* Privacy reminder */}
        <div style={{
          marginTop: 12, padding: '8px 10px', borderRadius: 8,
          background: 'rgba(108,71,255,.06)', border: '1px solid rgba(108,71,255,.12)',
          fontSize: 11, color: 'var(--text3)', lineHeight: 1.5,
        }}>
          🔒 Name, CV, and contact details are hidden until this candidate accepts your signal.
        </div>

        {/* Signal CTA */}
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button
            onClick={handleSignal}
            disabled={sending || busy || isSignalled}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 999, border: 'none',
              cursor: isSignalled ? 'default' : 'pointer',
              background: isSignalled
                ? 'rgba(245,158,11,.12)'
                : sending
                ? 'rgba(108,71,255,.3)'
                : 'linear-gradient(135deg, var(--violet), #4338ca)',
              color: isSignalled ? 'var(--amber)' : '#fff',
              fontWeight: 700, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: isSignalled ? 'none' : '0 4px 14px rgba(108,71,255,.3)',
              opacity: sending ? .7 : 1, transition: 'all .15s',
            }}
          >
            {sending ? (
              <><div style={{ width: 12, height: 12, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff',
                animation: 'spin .7s linear infinite' }}/> Sending…</>
            ) : isSignalled ? (
              '⏳ Signal sent — awaiting response'
            ) : (
              '⚡ Signal interest'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Mutual card (phase 3) ─────────────────────────────────────── */
function MutualCard({ match, onMessage }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid rgba(34,197,94,.25)',
      borderRadius: 14, padding: '14px 18px', marginBottom: 8,
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: 'var(--green-lt)', border: '1px solid rgba(34,197,94,.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>🤝</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
          {match.candidateName || match.alias || 'Candidate revealed'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2)' }}>
          {match.jobTitle} · {match.dnaScore}% DNA match
        </div>
      </div>
      <button
        onClick={() => onMessage(match)}
        style={{
          padding: '8px 16px', borderRadius: 999,
          background: 'linear-gradient(135deg, var(--violet), #4338ca)',
          color: '#fff', fontWeight: 700, fontSize: 13,
          border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(108,71,255,.3)',
        }}
      >
        Message →
      </button>
    </div>
  );
}

/* ── Main view ───────────────────────────────────────────────────── */
export default function EmpBlindMatches() {
  const { blindMatches, mutualMatches, loading, signalInterest } = useBlindMatch();
  const { navigate, showToast } = useApp();
  const [busy, setBusy] = useState(false);
  const [tab,  setTab]  = useState('candidates');

  async function handleSignal(matchId) {
    setBusy(true);
    try {
      await signalInterest(matchId);
      showToast('Interest signal sent — candidate will be notified ⚡', 'success');
    } catch {
      showToast('Failed to send signal — please try again', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="view scroll" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-sm" style={{ width: 28, height: 28, borderWidth: 3 }}/>
      </div>
    );
  }

  return (
    <div className="view scroll">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="page-hdr" style={{ marginBottom: 20 }}>
          <div>
            <div className="eyebrow">Double-Blind Matching</div>
            <div className="page-title">DNA-matched candidates</div>
            <div className="page-sub">
              Matched on Work DNA only — no names until mutual consent.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              background: 'var(--violet-lt)', border: '1px solid var(--border2)', color: '#a78bfa',
            }}>
              🧬 {blindMatches.length} in pool
            </div>
          </div>
        </div>

        {/* ── How it works ─────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(108,71,255,.08), rgba(13,148,136,.04))',
          border: '1px solid rgba(108,71,255,.18)', borderRadius: 14,
          padding: '14px 18px', marginBottom: 20,
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
        }}>
          {[
            { n: '1', t: 'DNA match', d: 'See Work DNA + archetype. No name, no CV, no photo.', c: 'var(--violet)' },
            { n: '2', t: 'Signal interest', d: 'Send a signal. Candidate sees your company + role only.', c: '#2dd4bf' },
            { n: '3', t: 'Mutual reveal', d: 'Candidate accepts → full profile unlocks + message thread opens.', c: 'var(--green)' },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 22, fontWeight: 800,
                color: s.c, flexShrink: 0, lineHeight: 1 }}>{s.n}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{s.t}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div className="tab-strip">
          <button className={`tab-btn ${tab === 'candidates' ? 'active' : ''}`}
            onClick={() => setTab('candidates')}>
            Candidate pool
            {blindMatches.length > 0 && (
              <span style={{ marginLeft: 6, background: 'var(--violet)', color: '#fff',
                fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 999 }}>
                {blindMatches.length}
              </span>
            )}
          </button>
          <button className={`tab-btn ${tab === 'mutual' ? 'active' : ''}`}
            onClick={() => setTab('mutual')}>
            Mutual reveals
            {mutualMatches.length > 0 && (
              <span style={{ marginLeft: 6, background: 'var(--green)', color: '#000',
                fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 999 }}>
                {mutualMatches.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Candidates tab ───────────────────────────────────── */}
        {tab === 'candidates' && (
          <>
            {blindMatches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🧬</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text2)', marginBottom: 6 }}>
                  No DNA matches yet
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
                  Complete your Team DNA profile so the algorithm can surface candidates whose working style
                  fits your team — not just their CV keywords.
                </div>
              </div>
            ) : (
              blindMatches.map(match => (
                <BlindCard
                  key={match.matchId}
                  match={match}
                  onSignal={handleSignal}
                  busy={busy}
                />
              ))
            )}
          </>
        )}

        {/* ── Mutual tab ───────────────────────────────────────── */}
        {tab === 'mutual' && (
          <>
            {mutualMatches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🤝</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text2)', marginBottom: 6 }}>
                  No mutual reveals yet
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
                  Signal interest in a candidate from the pool. Once they accept, full profiles reveal here
                  and you can start a conversation.
                </div>
              </div>
            ) : (
              mutualMatches.map(match => (
                <MutualCard
                  key={match.id}
                  match={match}
                  onMessage={() => navigate('emp-messages')}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
