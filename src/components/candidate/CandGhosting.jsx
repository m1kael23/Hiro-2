/**
 * CandGhosting.jsx — Candidate Reliability Score
 *
 * Real Firestore aggregation — no hardcoded mock values.
 *
 * Formula (from hiro-legal-framework-2.pdf §07):
 *   RS = 100 × (commitments_honoured / total_commitments)
 *   commitments_honoured = interviews_attended + offers_responded + processes_concluded
 *   total_commitments    = interviews_confirmed + offers_received + processes_accepted
 *
 *   Penalty deductions:
 *     no-show after confirmation  → −15
 *     no response to offer >7d    → −10
 *     silent withdrawal after 3+  → −8
 *   Recovery: +2 per clean process. Floor: 20.
 *
 * Firestore reads:
 *   applications/{id}  where candidateId == profile.id
 *     Fields used: status, interviewConfirmed, interviewAttended,
 *                  offerReceived, offerResponded, offerRespondedAt,
 *                  offerReceivedAt, stagesCompleted, withdrawnSilently,
 *                  noShow, createdAt, companyName, jobTitle
 */

import { useState, useEffect, useMemo } from 'react';
import {
  collection, query, where, getDocs, orderBy, limit,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useApp }  from '../../context/AppContext';

/* ── Score → display helpers ────────────────────────────────── */
function scoreColor(s) {
  if (s >= 90) return 'var(--green)';
  if (s >= 75) return '#2dd4bf';
  if (s >= 60) return 'var(--amber)';
  if (s >= 45) return '#f97316';
  return 'var(--red)';
}
function scoreBg(s) {
  if (s >= 90) return 'rgba(34,197,94,.10)';
  if (s >= 75) return 'rgba(45,212,191,.10)';
  if (s >= 60) return 'rgba(245,158,11,.10)';
  if (s >= 45) return 'rgba(249,115,22,.10)';
  return 'rgba(251,113,133,.10)';
}
function scoreBorder(s) {
  if (s >= 90) return 'rgba(34,197,94,.35)';
  if (s >= 75) return 'rgba(45,212,191,.35)';
  if (s >= 60) return 'rgba(245,158,11,.35)';
  if (s >= 45) return 'rgba(249,115,22,.35)';
  return 'rgba(251,113,133,.35)';
}
function scoreLabel(s) {
  if (s >= 90) return 'Excellent';
  if (s >= 75) return 'Good';
  if (s >= 60) return 'Fair';
  if (s >= 45) return 'Caution';
  return 'Poor';
}
function scoreEmoji(s) {
  if (s >= 90) return '🌟';
  if (s >= 75) return '✅';
  if (s >= 60) return '⚠️';
  if (s >= 45) return '🔶';
  return '🔴';
}
function benchImpact(s) {
  if (s >= 90) return { label: 'Priority access + first-mover windows', color: 'var(--green)' };
  if (s >= 75) return { label: 'Standard Bench access', color: '#2dd4bf' };
  if (s >= 60) return { label: 'Reduced Bench visibility', color: 'var(--amber)' };
  if (s >= 45) return { label: 'Bench access suspended / limited', color: '#f97316' };
  return { label: 'Bench credits revoked — warning shown on profile', color: 'var(--red)' };
}

/* ── Score calculation (mirrors legal framework formula) ─────── */
function calcReliabilityScore(apps) {
  let interviewsConfirmed = 0;
  let interviewsAttended  = 0;
  let offersReceived      = 0;
  let offersResponded     = 0;
  let processesAccepted   = 0;
  let processesConcluded  = 0;
  let penalties           = 0;
  let cleanProcesses      = 0;
  let noShows             = 0;
  let silentWithdrawals   = 0;
  let lateOfferResponses  = 0;

  apps.forEach(app => {
    const d = app;

    // Interviews
    if (d.interviewConfirmed) {
      interviewsConfirmed++;
      if (d.interviewAttended) {
        interviewsAttended++;
      } else if (d.noShow) {
        noShows++;
        penalties += 15;
      }
    }

    // Offers
    if (d.offerReceived) {
      offersReceived++;
      if (d.offerResponded) {
        offersResponded++;
        // Check if responded within 7 days
        if (d.offerReceivedAt && d.offerRespondedAt) {
          const days = (d.offerRespondedAt.toDate?.() - d.offerReceivedAt.toDate?.()) / 86400000;
          if (days > 7) {
            lateOfferResponses++;
            penalties += 10;
          }
        }
      }
    }

    // Process completion
    const stages = d.stagesCompleted || 0;
    if (stages >= 1) {
      processesAccepted++;
      if (d.status === 'hired' || d.status === 'rejected' || d.status === 'withdrawn_clean') {
        processesConcluded++;
        if (!d.noShow && !d.withdrawnSilently) {
          cleanProcesses++;
        }
      }
      if (d.withdrawnSilently && stages >= 3) {
        silentWithdrawals++;
        penalties += 8;
      }
    }
  });

  const total     = interviewsConfirmed + offersReceived + processesAccepted;
  const honoured  = interviewsAttended  + offersResponded + processesConcluded;

  let score = total > 0 ? Math.round(100 * honoured / total) : 100;
  score -= penalties;
  score += cleanProcesses * 2;
  score = Math.max(20, Math.min(100, score));

  return {
    score,
    total,
    honoured,
    interviewsConfirmed,
    interviewsAttended,
    offersReceived,
    offersResponded,
    processesAccepted,
    processesConcluded,
    cleanProcesses,
    penalties,
    noShows,
    silentWithdrawals,
    lateOfferResponses,
    hasEnoughData: total >= 2,
  };
}

/* ── Ring SVG ───────────────────────────────────────────────── */
function ScoreRing({ score, size = 120 }) {
  const r = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const dash = circ * score / 100;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={8}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray .8s cubic-bezier(.4,0,.2,1)' }}/>
    </svg>
  );
}

/* ── Stat mini card ─────────────────────────────────────────── */
function StatCard({ label, val, color, icon }) {
  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '12px 14px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 600 }}>{label}</div>
    </div>
  );
}

/* ── Timeline entry ─────────────────────────────────────────── */
function AppTimeline({ apps }) {
  if (!apps.length) return null;
  const recent = [...apps].sort((a, b) => {
    const ta = a.createdAt?.toDate?.() ?? 0;
    const tb = b.createdAt?.toDate?.() ?? 0;
    return tb - ta;
  }).slice(0, 5);

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="card-title" style={{ marginBottom: 14 }}>Recent activity</div>
      {recent.map((app, i) => {
        const isClean   = !app.noShow && !app.withdrawnSilently;
        const hasIssue  = app.noShow || app.withdrawnSilently;
        const dot = hasIssue ? 'var(--red)' : isClean && app.stagesCompleted >= 1 ? 'var(--green)' : 'var(--text3)';
        return (
          <div key={app.id || i} style={{
            display: 'flex', gap: 12, padding: '10px 0',
            borderBottom: i < recent.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: dot, flexShrink: 0, marginTop: 3 }}/>
              {i < recent.length - 1 && <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,.06)' }}/>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
                {app.jobTitle || 'Role'} — {app.companyName || 'Company'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                {app.noShow && <span style={{ color: 'var(--red)', fontWeight: 600 }}>No-show after confirmation · </span>}
                {app.withdrawnSilently && <span style={{ color: '#f97316', fontWeight: 600 }}>Silent withdrawal · </span>}
                {!hasIssue && app.stagesCompleted >= 1 && <span style={{ color: 'var(--green)', fontWeight: 600 }}>Clean process · </span>}
                {app.status ? app.status.replace(/_/g, ' ') : 'In progress'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export default function CandGhosting() {
  const { profile } = useAuth();
  const { showToast } = useApp();

  const [apps,    setApps]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('overview');

  /* ── Fetch from Firestore ─────────────────────────────────── */
  useEffect(() => {
    if (!profile?.id) { setLoading(false); return; }
    (async () => {
      try {
        const q = query(
          collection(db, 'applications'),
          where('candidateId', '==', profile.id),
          orderBy('createdAt', 'desc'),
          limit(100),
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setApps(data);
      } catch (e) {
        console.error('CandGhosting fetch error:', e);
        // Graceful degradation: show empty state, not a crash
        setApps([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id]);

  /* ── Derived stats ────────────────────────────────────────── */
  const stats = useMemo(() => calcReliabilityScore(apps), [apps]);

  const impact = benchImpact(stats.score);

  /* ── Loading ──────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="view scroll" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-sm" style={{ width: 28, height: 28, borderWidth: 3 }}/>
      </div>
    );
  }

  /* ── Main render ──────────────────────────────────────────── */
  return (
    <div className="view scroll">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* ── Hero banner ─────────────────────────────────────── */}
        <div style={{
          background: `linear-gradient(135deg, ${scoreBg(stats.score)}, rgba(14,17,36,.95))`,
          border: `1px solid ${scoreBorder(stats.score)}`,
          borderRadius: 20, padding: '24px 28px', marginBottom: 16,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%',
            background: `radial-gradient(circle, ${scoreBg(stats.score)}, transparent 70%)` }}/>
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 24 }}>

            {/* Ring + score */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <ScoreRing score={stats.score} size={110}/>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 28, fontWeight: 800,
                  color: scoreColor(stats.score), lineHeight: 1 }}>{stats.score}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 2 }}>score</div>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '.14em', color: 'var(--text3)', marginBottom: 4 }}>Reliability Score</div>
              <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 26, fontWeight: 800,
                letterSpacing: '-0.04em', marginBottom: 4 }}>
                {scoreEmoji(stats.score)} {scoreLabel(stats.score)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10, lineHeight: 1.5 }}>
                {stats.hasEnoughData
                  ? `Based on ${stats.total} tracked commitment${stats.total !== 1 ? 's' : ''} — ${stats.honoured} honoured`
                  : 'Not enough activity yet — complete more processes to build your score'}
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 999,
                background: scoreBg(stats.score), border: `1px solid ${scoreBorder(stats.score)}`,
                fontSize: 12, fontWeight: 600, color: impact.color,
              }}>
                🪑 Bench: {impact.label}
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab strip ─────────────────────────────────────── */}
        <div className="tab-strip" style={{ marginBottom: 16 }}>
          {['overview', 'breakdown', 'history'].map(t => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>
              {t}
            </button>
          ))}
        </div>

        {/* ════ OVERVIEW tab ════════════════════════════════════ */}
        {tab === 'overview' && (
          <>
            {/* Stat grid */}
            <div className="g4" style={{ marginBottom: 14 }}>
              <StatCard label="Interviews" val={`${stats.interviewsAttended}/${stats.interviewsConfirmed}`}
                color="var(--cyan)" icon="📅"/>
              <StatCard label="Offers responded" val={`${stats.offersResponded}/${stats.offersReceived}`}
                color="#a78bfa" icon="📬"/>
              <StatCard label="Clean processes" val={stats.cleanProcesses}
                color="var(--green)" icon="✅"/>
              <StatCard label="Penalties" val={`−${stats.penalties}`}
                color={stats.penalties > 0 ? 'var(--red)' : 'var(--text3)'} icon="⚠️"/>
            </div>

            {/* Score formula explanation */}
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title" style={{ marginBottom: 12 }}>How your score is calculated</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Base calculation', val: stats.total > 0
                    ? `${stats.honoured} / ${stats.total} commitments honoured = ${Math.round(100 * stats.honoured / (stats.total || 1))}%`
                    : 'No commitments tracked yet', color: 'var(--cyan)' },
                  { label: 'Clean process bonus', val: `+${stats.cleanProcesses * 2} pts (${stats.cleanProcesses} × 2)`, color: 'var(--green)' },
                  { label: 'Penalties applied', val: stats.penalties > 0
                    ? `−${stats.penalties} pts (${stats.noShows} no-show, ${stats.silentWithdrawals} silent exit, ${stats.lateOfferResponses} late response)`
                    : 'None — keep it up!', color: stats.penalties > 0 ? 'var(--red)' : 'var(--text3)' },
                  { label: 'Floor', val: 'Minimum score is always 20', color: 'var(--text3)' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between',
                    fontSize: 13, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                    <span style={{ color: 'var(--text2)' }}>{row.label}</span>
                    <span style={{ fontWeight: 600, color: row.color }}>{row.val}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  fontSize: 14, fontWeight: 800, color: scoreColor(stats.score), paddingTop: 4 }}>
                  <span>Final score</span>
                  <span>{stats.score} / 100</span>
                </div>
              </div>
            </div>

            {/* Bench impact */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>Score thresholds & Bench impact</div>
              {[
                { range: '90–100', label: 'Excellent', color: 'var(--green)', impact: 'Priority Bench access + first-mover windows' },
                { range: '75–89', label: 'Good',      color: '#2dd4bf',       impact: 'Standard Bench access' },
                { range: '60–74', label: 'Fair',      color: 'var(--amber)', impact: 'Reduced Bench visibility' },
                { range: '45–59', label: 'Caution',   color: '#f97316',      impact: 'Bench access suspended / limited' },
                { range: '< 45',  label: 'Poor',      color: 'var(--red)',   impact: 'Bench credits revoked — warning on profile' },
              ].map(row => {
                const active = (
                  (row.range === '90–100' && stats.score >= 90) ||
                  (row.range === '75–89'  && stats.score >= 75 && stats.score < 90) ||
                  (row.range === '60–74'  && stats.score >= 60 && stats.score < 75) ||
                  (row.range === '45–59'  && stats.score >= 45 && stats.score < 60) ||
                  (row.range === '< 45'   && stats.score < 45)
                );
                return (
                  <div key={row.range} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                    borderRadius: 8, marginBottom: 4,
                    background: active ? `${scoreBg(stats.score)}` : 'transparent',
                    border: active ? `1px solid ${scoreBorder(stats.score)}` : '1px solid transparent',
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, flexShrink: 0 }}/>
                    <div style={{ width: 50, fontSize: 12, fontWeight: 700, color: row.color }}>{row.range}</div>
                    <div style={{ width: 64, fontSize: 12, fontWeight: 600, color: active ? row.color : 'var(--text2)' }}>{row.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', flex: 1 }}>{row.impact}</div>
                    {active && <div style={{ fontSize: 11, fontWeight: 700, color: row.color }}>← You</div>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ════ BREAKDOWN tab ══════════════════════════════════ */}
        {tab === 'breakdown' && (
          <>
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title" style={{ marginBottom: 14 }}>Commitment breakdown</div>
              {[
                { label: 'Interviews confirmed', kept: stats.interviewsAttended, total: stats.interviewsConfirmed, color: 'var(--cyan)' },
                { label: 'Offers responded', kept: stats.offersResponded, total: stats.offersReceived, color: '#a78bfa' },
                { label: 'Processes concluded cleanly', kept: stats.processesConcluded, total: stats.processesAccepted, color: 'var(--green)' },
              ].map(row => {
                const pct = row.total > 0 ? Math.round(row.kept / row.total * 100) : 100;
                return (
                  <div key={row.label} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text2)' }}>{row.label}</span>
                      <span style={{ fontWeight: 700, color: row.color }}>{row.kept}/{row.total} · {pct}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`,
                        background: row.color, transition: 'width .6s' }}/>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>Penalty events</div>
              {stats.noShows === 0 && stats.silentWithdrawals === 0 && stats.lateOfferResponses === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--green)', fontSize: 14, fontWeight: 600 }}>
                  🎉 No penalty events on record
                </div>
              ) : (
                [
                  { label: 'No-shows after confirmation', count: stats.noShows, penalty: 15, color: 'var(--red)' },
                  { label: 'Silent withdrawals (3+ rounds)', count: stats.silentWithdrawals, penalty: 8, color: '#f97316' },
                  { label: 'Late offer responses (>7 days)', count: stats.lateOfferResponses, penalty: 10, color: 'var(--amber)' },
                ].filter(r => r.count > 0).map(row => (
                  <div key={row.label} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: 8, marginBottom: 6,
                    background: 'rgba(251,113,133,.06)', border: '1px solid rgba(251,113,133,.15)',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{row.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{row.count} event{row.count !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: row.color }}>
                      −{row.count * row.penalty} pts
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ════ HISTORY tab ════════════════════════════════════ */}
        {tab === 'history' && (
          <>
            {apps.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No applications tracked yet</div>
                <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
                  As you apply and interview through Hiro, your commitment history will appear here.
                </div>
              </div>
            ) : (
              <AppTimeline apps={apps}/>
            )}
          </>
        )}

        {/* ── Footer disclaimer ───────────────────────────────── */}
        <div style={{
          marginTop: 20, padding: '12px 16px', borderRadius: 10,
          background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)',
          fontSize: 12, color: 'var(--text3)', lineHeight: 1.6,
        }}>
          <strong style={{ color: 'var(--text2)' }}>About this score</strong> — Your Reliability Score is an
          algorithmic signal based on response-rate data and commitment history tracked on Hiro. It is not a
          legal finding or professional reference. You can contest any event via Settings → Score dispute.
        </div>
      </div>
    </div>
  );
}
