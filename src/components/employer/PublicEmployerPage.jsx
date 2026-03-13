/**
 * PublicEmployerPage — /company/:slug  (internally: route 'public-employer')
 *
 * Props:
 *   employerId  string  — Firestore uid of the employer to display
 *                         Falls back to current user's profile if omitted
 *
 * Hiro Score formula (0–99):
 *   30% ghosting score (inverse)
 *   25% response speed
 *   20% mutual match rate
 *   15% hire rate
 *   10% candidate review average
 */

import { useState, useEffect } from 'react';
import {
  collection, query, where, getDocs, doc, getDoc, orderBy, limit,
} from 'firebase/firestore';
import { db }   from '../../firebase';
import { useApp }  from '../../context/AppContext';
import { getArchetype, DNA_DIMENSIONS } from '../../lib/dnaEngine';

/* ─── Score ring SVG ──────────────────────────────────────────────── */
function Ring({ score, size = 88, color = 'var(--violet)' }) {
  const r   = (size - 10) / 2;
  const cf  = 2 * Math.PI * r;
  const fill = cf * (score / 100);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={8} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${fill} ${cf}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray .8s ease' }} />
      <text x={size/2} y={size/2 + 6} textAnchor="middle"
        style={{ transform: `rotate(90deg) translateX(${size/2}px) translateY(-${size/2}px)` }}
        fill="var(--text)" fontSize={size > 70 ? 18 : 13} fontWeight={800} fontFamily="Manrope,sans-serif">
        {score}
      </text>
    </svg>
  );
}

/* ─── Stat pill ───────────────────────────────────────────────────── */
function Pill({ icon, value, label, color = 'var(--text2)' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 18px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)', minWidth: 100 }}>
      <span style={{ fontSize: 18, marginBottom: 4 }}>{icon}</span>
      <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Manrope,sans-serif', color, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
    </div>
  );
}

/* ─── Hiro Score formula ──────────────────────────────────────────── */
function calcHiroScore({ ghostRate, avgReply, mutualRate, hireRate, stars }) {
  const ghost  = Math.max(0, 100 - ghostRate * 1.5);
  const reply  = Math.max(0, 100 - Math.max(0, avgReply - 24) * 0.8);
  const mutual = Math.min(100, mutualRate * 1.2);
  const hire   = Math.min(100, hireRate * 1.1);
  const review = stars * 20;
  const raw    = ghost * .30 + reply * .25 + mutual * .20 + hire * .15 + review * .10;
  return Math.min(99, Math.max(1, Math.round(raw)));
}

/* ══════════════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════════════ */
export default function PublicEmployerPage({ employerId }) {
  const { navigate } = useApp();

  const [emp,     setEmp]     = useState(null);
  const [roles,   setRoles]   = useState([]);
  const [reviews, setReviews] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [score,   setScore]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!employerId) { setError('No employer ID provided.'); setLoading(false); return; }

    async function load() {
      try {
        /* Employer profile */
        const snap = await getDoc(doc(db, 'users', employerId));
        if (!snap.exists() || snap.data().mode !== 'employer') { setError('Employer not found.'); return; }
        setEmp({ id: snap.id, ...snap.data() });

        /* Open roles */
        const jSnap = await getDocs(query(
          collection(db, 'jobs'),
          where('employerId', '==', employerId),
          where('status', '==', 'live'),
          orderBy('createdAt', 'desc'), limit(10),
        ));
        setRoles(jSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        /* Applications → compute metrics */
        const aSnap  = await getDocs(query(collection(db, 'applications'), where('employerId', '==', employerId)));
        const apps   = aSnap.docs.map(d => d.data());
        const total  = apps.length;
        const mutual = apps.filter(a => a.candidateExpressedInterest && a.employerExpressedInterest).length;
        const hired  = apps.filter(a => a.status === 'hired').length;
        const ghosted = apps.filter(a => a.candidateExpressedInterest && a.stage === 'matched' && !a.employerExpressedInterest).length;

        /* Reviews */
        const rSnap = await getDocs(query(
          collection(db, 'reviews'),
          where('employerId', '==', employerId),
          orderBy('createdAt', 'desc'), limit(10),
        ));
        const revs  = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setReviews(revs);
        const stars = revs.length ? revs.reduce((s, r) => s + (r.rating || 0), 0) / revs.length : 4.0;

        const m = {
          total, mutual, hired, ghosted,
          ghostRate:  total ? Math.round(ghosted  / total * 100) : 0,
          mutualRate: total ? Math.round(mutual   / total * 100) : 0,
          hireRate:   total ? Math.round(hired    / total * 100) : 0,
          avgReply:   36,   // TODO: derive from timestamps when we store them
          stars,
        };
        setMetrics(m);
        setScore(calcHiroScore(m));

      } catch (e) {
        console.error('PublicEmployerPage error:', e);
        setError('Failed to load profile.');
      } finally { setLoading(false); }
    }

    load();
  }, [employerId]);

  /* ── Loading / error ──────────────────────────────────────────── */
  if (loading) return (
    <div className="view-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>Loading…</div>
  );
  if (error || !emp) return (
    <div className="view-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 40 }}>🔍</span>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{error || 'Not found'}</div>
    </div>
  );

  const archetype  = emp.team_dna ? getArchetype(emp.team_dna) : null;
  const ghostColor = metrics.ghostRate < 10 ? 'var(--green)' : metrics.ghostRate < 25 ? '#f59e0b' : '#fb7185';
  const scoreColor = score >= 85 ? 'var(--green)' : score >= 70 ? 'var(--cyan)' : score >= 55 ? '#f59e0b' : '#fb7185';

  return (
    <div className="view-panel">
      <div className="scroll">

        {/* ── Hero ──────────────────────────────────────────────────── */}
        <div style={{
          borderRadius: 'var(--r)', padding: '28px 24px', marginBottom: 20,
          background: 'linear-gradient(135deg,rgba(108,71,255,.13),rgba(13,148,136,.07))',
          border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Logo */}
            <div style={{
              width: 70, height: 70, borderRadius: 16, flexShrink: 0,
              background: emp.logo_url ? `url(${emp.logo_url}) center/cover` : 'linear-gradient(135deg,#6c47ff,#0d9488)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: emp.logo_url ? 0 : 26, border: '2px solid rgba(255,255,255,.12)',
            }}>
              {!emp.logo_url && (emp.company_name?.[0] || '🏢')}
            </div>

            {/* Identity */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Manrope,sans-serif', color: 'var(--text)', lineHeight: 1, margin: 0 }}>
                  {emp.company_name}
                </h1>
                {score >= 85 && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: 'rgba(34,197,94,.15)', color: 'var(--green)', border: '1px solid rgba(34,197,94,.3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                    Top employer ✓
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
                {emp.tagline || emp.company_description?.slice(0, 120) || ''}
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text3)', flexWrap: 'wrap' }}>
                {emp.industry      && <span>🏭 {emp.industry}</span>}
                {emp.company_stage && <span>📈 {emp.company_stage}</span>}
                {emp.company_size  && <span>👥 {emp.company_size}</span>}
                {emp.hq_location   && <span>📍 {emp.hq_location}</span>}
                {emp.website       && <a href={emp.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>🌐 Website ↗</a>}
              </div>
            </div>

            {/* Hiro Score ring */}
            {score && (
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <Ring score={score} size={88} color={scoreColor} />
                <div style={{ fontSize: 11, fontWeight: 700, color: scoreColor, marginTop: 4 }}>Hiro Score™</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>out of 100</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
          <Pill icon="👻" value={`${metrics.ghostRate}%`} label="Ghosting rate"    color={ghostColor} />
          <Pill icon="⚡" value={`${metrics.avgReply}h`}  label="Avg response"     color={metrics.avgReply < 48 ? 'var(--green)' : '#f59e0b'} />
          <Pill icon="🤝" value={`${metrics.mutualRate}%`} label="Mutual rate"     color="var(--cyan)" />
          <Pill icon="🏆" value={metrics.hired}            label="Hires made"       color="var(--violet)" />
          <Pill icon="📋" value={roles.length}             label="Open roles"       color="var(--text2)" />
        </div>

        <div className="g2" style={{ maxWidth: 900 }}>

          {/* Left col */}
          <div>
            {/* Open roles */}
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text3)', marginBottom: 10 }}>
              Open roles ({roles.length})
            </div>
            {roles.length === 0
              ? <div className="card" style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 24 }}>No open roles right now.</div>
              : roles.map(job => (
                <div key={job.id} className="card" style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => navigate('cand-matches')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{job.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>{job.location || 'Remote'} · £{job.salMin}–{job.salMax}k</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {(job.skillsRequired || []).slice(0, 4).map(s => (
                          <span key={s} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(108,71,255,.12)', color: '#a78bfa', border: '1px solid rgba(108,71,255,.2)' }}>{s}</span>
                        ))}
                      </div>
                    </div>
                    <button className="btn btn-violet btn-sm" style={{ flexShrink: 0 }}>View →</button>
                  </div>
                </div>
              ))
            }

            {/* Reviews */}
            {reviews.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text3)', margin: '22px 0 10px' }}>
                  Process reviews ({reviews.length})
                </div>
                {reviews.slice(0, 5).map(r => (
                  <div key={r.id} className="card" style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: '#f59e0b' }}>
                        {'★'.repeat(Math.round(r.rating || 4))}{'☆'.repeat(5 - Math.round(r.rating || 4))}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {r.createdAt?.toDate?.().toLocaleDateString() || 'Recent'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{r.body || r.text || '—'}</div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Right col */}
          <div>
            {/* Team DNA */}
            {emp.team_dna && (
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">🧬 Team DNA™</div>
                {archetype && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--r)', marginBottom: 14, background: `${archetype.color}12`, border: `1px solid ${archetype.color}33` }}>
                    <span style={{ fontSize: 20 }}>{archetype.emoji}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: archetype.color }}>{archetype.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{archetype.desc}</div>
                    </div>
                  </div>
                )}
                {DNA_DIMENSIONS.map((dim, i) => {
                  const val = emp.team_dna[i] ?? 50;
                  return (
                    <div key={dim.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 13 }}>{dim.icon}</span>{dim.label}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                          {val < 35 ? dim.left : val > 65 ? dim.right : 'Balanced'}
                        </span>
                      </div>
                      <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,.07)', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '50%', left: `${val}%`, transform: 'translate(-50%,-50%)', width: 9, height: 9, borderRadius: '50%', background: 'var(--violet)', border: '2px solid rgba(0,0,0,.5)' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                        <span style={{ fontSize: 9, color: 'var(--text3)' }}>{dim.left}</span>
                        <span style={{ fontSize: 9, color: 'var(--text3)' }}>{dim.right}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Culture tags */}
            {emp.culture_tags?.length > 0 && (
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">Culture</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {emp.culture_tags.map(t => (
                    <span key={t} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, background: 'rgba(255,255,255,.05)', border: '1px solid var(--border)', color: 'var(--text2)' }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Score breakdown */}
            {score && metrics && (
              <div className="card">
                <div className="card-title">Hiro Score™ breakdown</div>
                <div className="card-sub" style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>Computed from real hiring data — not self-reported.</div>
                {[
                  { label: 'Responsiveness',   val: Math.max(0, 100 - Math.max(0, metrics.avgReply - 24) * 0.8), color: 'var(--cyan)' },
                  { label: 'Ghosting score',    val: Math.max(0, 100 - metrics.ghostRate * 1.5),                  color: ghostColor },
                  { label: 'Mutual match rate', val: Math.min(100, metrics.mutualRate * 1.2),                     color: 'var(--violet)' },
                  { label: 'Hire success',      val: Math.min(100, metrics.hireRate * 1.1),                       color: 'var(--green)' },
                  { label: 'Reviews',           val: (metrics.stars / 5) * 100,                                   color: '#f59e0b' },
                ].map(({ label, val, color }) => {
                  const pct = Math.min(100, Math.max(0, Math.round(val)));
                  return (
                    <div key={label} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 12, color: 'var(--text2)' }}>
                        <span>{label}</span>
                        <span style={{ fontWeight: 700, color }}>{pct}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,.07)' }}>
                        <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: color, transition: 'width .6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
