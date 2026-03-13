import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

// ── Thresholds ─────────────────────────────────────────────────
const HOURS_72 = 72 * 60 * 60 * 1000;
const DAYS_14  = 14 * 24 * 60 * 60 * 1000;

const RESPONDED_STAGES = new Set(['shortlist', 'interview', 'final', 'offer', 'hired', 'rejected', 'closed']);

// ── Derived metrics from applications ─────────────────────────

function calcMetrics(apps) {
  const now = Date.now();

  // Only apps where a candidate expressed interest need a response
  const needResponse = apps.filter(a => a.candidateExpressedInterest);
  const responded    = needResponse.filter(a => RESPONDED_STAGES.has((a.stage || '').toLowerCase()));
  const rate         = needResponse.length > 0
    ? Math.round((responded.length / needResponse.length) * 100)
    : null;

  // Avg response time in days (only responded apps)
  let avgDays = null;
  if (responded.length > 0) {
    const totalMs = responded.reduce((sum, a) => {
      const created = a.createdAt?.toMillis?.() || 0;
      const updated = a.updatedAt?.toMillis?.() || 0;
      return sum + Math.max(0, updated - created);
    }, 0);
    avgDays = (totalMs / responded.length / 86400000).toFixed(1);
  }

  // Open flags: candidate interested, no response yet, past deadline
  const flags = needResponse.filter(a => {
    if (a.ghostFlagClosed) return false;
    const stage  = (a.stage || '').toLowerCase();
    const age    = now - (a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0);
    // Unresponded mutual match > 72h
    if (!RESPONDED_STAGES.has(stage) && a.employerExpressedInterest && age > HOURS_72) return true;
    // Stuck at interview/final > 14d
    if (['interview', 'final'].includes(stage) && age > DAYS_14) return true;
    return false;
  });

  return { rate, avgDays, flags, responded, needResponse };
}

function buildLog(apps) {
  return apps
    .filter(a => RESPONDED_STAGES.has((a.stage || '').toLowerCase()))
    .sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0))
    .slice(0, 8)
    .map(a => {
      const stage   = (a.stage || '').toLowerCase();
      const role    = a.jobTitle || 'Role';
      const score   = a.matchScore ? ` · ${a.matchScore}% match` : '';
      const updMs   = a.updatedAt?.toMillis?.() || 0;
      const ageDays = Math.floor((Date.now() - updMs) / 86400000);
      const ageStr  = ageDays === 0 ? 'Today' : ageDays === 1 ? 'Yesterday' : `${ageDays}d ago`;

      if (stage === 'offer' || stage === 'hired') {
        return { dot: '✓', dotStyle: { background: 'var(--green-lt)', border: '1px solid rgba(34,197,94,.3)' },
          title: `Offer sent · ${role}${score}`, sub: ageStr, badge: 'Offer out',
          badgeStyle: { background: 'var(--green-lt)', border: '1px solid rgba(34,197,94,.25)', color: 'var(--green)' } };
      }
      if (stage === 'interview') {
        return { dot: '→', dotStyle: { background: 'var(--cyan-lt)', border: '1px solid rgba(56,189,248,.25)' },
          title: `Interview stage · ${role}${score}`, sub: ageStr, badge: 'Interview',
          badgeStyle: { background: 'var(--cyan-lt)', border: '1px solid rgba(56,189,248,.25)', color: 'var(--cyan)' } };
      }
      if (stage === 'shortlist') {
        return { dot: '✓', dotStyle: { background: 'var(--green-lt)', border: '1px solid rgba(34,197,94,.3)' },
          title: `Shortlisted · ${role}${score}`, sub: ageStr, badge: 'Shortlisted',
          badgeStyle: { background: 'var(--green-lt)', border: '1px solid rgba(34,197,94,.25)', color: 'var(--green)' } };
      }
      if (stage === 'rejected' || stage === 'closed') {
        return { dot: '↩', dotStyle: { background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)' },
          title: `Process closed · ${role}`, sub: ageStr, badge: 'Closed',
          badgeStyle: { background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.15)', color: 'var(--text3)' } };
      }
      return { dot: '·', dotStyle: { background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)' },
        title: `${stage} · ${role}`, sub: ageStr, badge: stage,
        badgeStyle: { background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.15)', color: 'var(--text3)' } };
    });
}

function rateLabel(rate) {
  if (rate === null) return { text: 'No data yet',   color: 'var(--text3)' };
  if (rate >= 90)    return { text: 'excellent',      color: 'var(--green)' };
  if (rate >= 75)    return { text: 'strong',         color: 'var(--cyan)'  };
  if (rate >= 50)    return { text: 'needs attention',color: 'var(--amber)' };
  return               { text: 'at risk',           color: '#fb7185'      };
}

function hiroImpact(rate) {
  if (rate === null) return { val: '—',    color: 'var(--text3)' };
  if (rate >= 90)    return { val: '+0.3', color: 'var(--green)' };
  if (rate >= 80)    return { val: '+0.0', color: 'var(--text3)' };
  if (rate >= 60)    return { val: '−0.2', color: 'var(--amber)' };
  return               { val: '−0.5', color: '#fb7185'      };
}

// ── Component ─────────────────────────────────────────────────

export default function EmpGhosting() {
  const { showToast } = useApp();
  const { profile }   = useAuth();
  const [apps,    setApps]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) { setLoading(false); return; }
    const q = query(
      collection(db, 'applications'),
      where('employerId', '==', profile.id),
    );
    const unsub = onSnapshot(q, snap => {
      setApps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => { console.error('EmpGhosting apps error:', err); setLoading(false); });
    return () => unsub();
  }, [profile?.id]);

  async function closeFlag(appId) {
    try {
      await updateDoc(doc(db, 'applications', appId), {
        ghostFlagClosed:   true,
        ghostFlagClosedAt: serverTimestamp(),
        updatedAt:         serverTimestamp(),
      });
      showToast('Loop closed ✓', 'success');
    } catch (err) {
      console.error('closeFlag error:', err);
      showToast('Failed to close flag', 'error');
    }
  }

  const { rate, avgDays, flags, needResponse } = calcMetrics(apps);
  const log     = buildLog(apps);
  const label   = rateLabel(rate);
  const impact  = hiroImpact(rate);

  // SVG ring: circumference of r=40 circle = 251.2
  const CIRC      = 251.2;
  const dashOffset = rate !== null ? Math.round(CIRC * (1 - rate / 100)) : CIRC;

  const benchmarks = [
    { label: 'Your rate',    val: rate !== null ? `${rate}%` : '—', color: label.color, pct: rate !== null ? `${rate}%` : '0%' },
    { label: 'Top 15%',     val: '90%+',  color: '#a78bfa', pct: '90%' },
    { label: 'Platform avg',val: '71%',   color: 'var(--cyan)', pct: '71%' },
    { label: 'Bottom 25%',  val: '< 50%', color: 'var(--red)',  pct: '50%' },
  ];

  return (
    <div className="view">
      <div className="scroll">
        <div className="review-shell">
          <div className="page-hdr" style={{ maxWidth: 780, marginBottom: 18 }}>
            <div>
              <div className="eyebrow">Accountability layer</div>
              <div className="page-title">Ghosting Score</div>
              <div className="page-sub">Candidates see your response rate before they apply. Close the loop — it directly affects your Hiro Score™.</div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => showToast('Ghost report exported to CSV', 'success')}
            >Export log</button>
          </div>

          {/* Hero */}
          <div className="ghost-hero">
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(139,92,246,.8)', marginBottom: 8 }}>
                  {profile?.company_name || 'Your company'} · Response health
                </div>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 10 }}>
                  {loading ? 'Loading…' : rate === null
                    ? 'No applications yet'
                    : <>Your response rate is <span style={{ color: label.color }}>{label.text}</span></>
                  }
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
                  {[
                    [loading ? '…' : rate !== null ? `${rate}%` : '—', 'Response rate',    label.color],
                    [loading ? '…' : avgDays ? `${avgDays}d`   : '—', 'Avg response time','var(--cyan)'],
                    [loading ? '…' : String(flags.length),             'Open flags',        flags.length > 0 ? 'var(--amber)' : 'var(--green)'],
                    [impact.val,                                        'Hiro Score impact', impact.color],
                  ].map(([val, lbl, color]) => (
                    <div key={lbl}>
                      <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 32, fontWeight: 800, color }}>{val}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{lbl}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', maxWidth: 440, lineHeight: 1.7 }}>
                  {rate !== null && rate >= 90
                    ? `${rate}% puts you in the top 15% of employers — a meaningful signal for passive candidates deciding whether to engage.`
                    : rate !== null
                    ? `Respond to candidates within 72 hours to improve your score. Candidates see your response rate before applying.`
                    : 'Your response rate will appear here once candidates start expressing interest in your roles.'}
                </div>
              </div>

              {/* Ring */}
              <div className="ghost-score-ring">
                <svg width="96" height="96" viewBox="0 0 96 96">
                  <defs>
                    <linearGradient id="ghostGrad">
                      <stop offset="0%" stopColor={rate !== null && rate >= 75 ? '#22c55e' : '#f59e0b'} />
                      <stop offset="100%" stopColor="#38bdf8" />
                    </linearGradient>
                  </defs>
                  <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="8" />
                  <circle
                    cx="48" cy="48" r="40"
                    fill="none"
                    stroke={rate !== null ? 'url(#ghostGrad)' : 'rgba(255,255,255,.12)'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    strokeDashoffset={dashOffset}
                    style={{ transition: 'stroke-dashoffset .6s ease' }}
                  />
                </svg>
                <div className="ghost-score-val">
                  <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 20, fontWeight: 800, color: '#fff' }}>
                    {loading ? '…' : rate !== null ? `${rate}%` : '—'}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>Response</div>
                </div>
              </div>
            </div>
          </div>

          {/* Flag trigger info */}
          <div style={{ padding: '12px 16px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border2)', fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>
            <strong style={{ color: 'var(--text)' }}>What triggers a ghost flag:</strong> No status update 14+ days after any interview stage, or no response to a mutual match message within 72 hours.
          </div>

          <div className="g2">
            <div>
              {/* Active flags */}
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: flags.length > 0 ? 'var(--red)' : 'var(--text3)', marginBottom: 10 }}>
                ⚠ Open flags ({loading ? '…' : flags.length})
              </div>

              {loading ? (
                <div style={{ fontSize: 12, color: 'var(--text3)', padding: '12px 0' }}>Loading…</div>
              ) : flags.length === 0 ? (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--r)', border: '1px solid rgba(34,197,94,.25)', background: 'rgba(34,197,94,.05)', fontSize: 12, color: 'var(--green)', marginBottom: 8 }}>
                  ✓ No open flags — response health {rate !== null ? label.text : 'pending data'}
                </div>
              ) : (
                flags.map(flag => {
                  const stage   = (flag.stage || 'matched').toLowerCase();
                  const role    = flag.jobTitle || 'Role';
                  const updMs   = flag.updatedAt?.toMillis?.() || flag.createdAt?.toMillis?.() || 0;
                  const ageDays = Math.floor((Date.now() - updMs) / 86400000);
                  return (
                    <div key={flag.id} className="ghost-flag" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="ghost-dot" style={{ background: 'rgba(251,113,133,.12)', border: '1px solid rgba(251,113,133,.25)', fontSize: 14 }}>👤</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>Candidate · {role}</div>
                          <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                            {stage === 'matched' || stage === 'applied'
                              ? `No response to mutual match · ${ageDays} days elapsed`
                              : `${stage} stage · ${ageDays} days since last update`}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                        <button
                          style={{ padding: '5px 14px', borderRadius: 999, background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.3)', color: 'var(--green)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                          onClick={() => closeFlag(flag.id)}
                        >✓ Close loop</button>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Response log */}
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--text3)', margin: '16px 0 10px' }}>
                Response log · Recent activity
              </div>
              <div className="card" style={{ padding: 0 }}>
                {loading ? (
                  <div style={{ padding: '16px', fontSize: 12, color: 'var(--text3)' }}>Loading…</div>
                ) : log.length === 0 ? (
                  <div style={{ padding: '16px', fontSize: 12, color: 'var(--text3)' }}>No responses logged yet. Activity will appear here as you respond to candidates.</div>
                ) : log.map((item, i) => (
                  <div key={i} className="ghost-log-item" style={{ padding: '12px 16px' }}>
                    <div className="ghost-dot" style={item.dotStyle}>{item.dot}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>{item.sub}</div>
                    </div>
                    <span className="ghost-badge" style={item.badgeStyle}>{item.badge}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right sidebar */}
            <div>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">Industry benchmarks</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {benchmarks.map(b => (
                    <div key={b.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                        <span style={{ color: 'var(--text2)' }}>{b.label}</span>
                        <span style={{ fontWeight: 700, color: b.color }}>{b.val}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: b.pct, background: b.color, borderRadius: 'inherit', transition: 'width .5s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-title">Score impact</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
                  Response rate accounts for <strong style={{ color: 'var(--text)' }}>15%</strong> of your Hiro Score™. Dropping below 80% triggers a warning badge visible to candidates browsing your jobs.
                </div>
                <div style={{
                  marginTop: 10, padding: '9px 12px', borderRadius: 'var(--r)', fontSize: 12,
                  background: rate !== null && rate >= 90 ? 'rgba(34,197,94,.06)' : rate !== null && rate < 60 ? 'rgba(251,113,133,.08)' : 'rgba(255,255,255,.04)',
                  border: rate !== null && rate >= 90 ? '1px solid rgba(34,197,94,.2)' : rate !== null && rate < 60 ? '1px solid rgba(251,113,133,.2)' : '1px solid var(--border2)',
                  color: rate !== null && rate >= 90 ? 'var(--green)' : rate !== null && rate < 60 ? '#fb7185' : 'var(--text2)',
                }}>
                  {rate === null
                    ? 'Your score impact will appear here once you have application data.'
                    : rate >= 90
                    ? `At ${rate}% you're earning a ${impact.val} Hiro Score bonus vs platform average.`
                    : rate >= 80
                    ? `At ${rate}% you're tracking at platform average. Aim for 90%+ to earn a score bonus.`
                    : `At ${rate}% your Hiro Score has a ${impact.val} adjustment. Responding faster to candidates will improve this.`}
                </div>
                {needResponse.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>
                    Based on {needResponse.length} application{needResponse.length !== 1 ? 's' : ''} where candidates expressed interest
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
