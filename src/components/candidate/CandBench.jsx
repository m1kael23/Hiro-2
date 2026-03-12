import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';

const HORIZONS = [
  { id: '3mo',  label: '3 months',  desc: 'Employers see: "Open to conversations from June 2026" — no specific date, just a horizon signal.' },
  { id: '6mo',  label: '6 months',  desc: 'Employers see: "Open to conversations from September 2026" — no specific date, just a horizon signal.' },
  { id: '12mo', label: '12 months', desc: 'Employers see: "Open to conversations from March 2027" — no specific date, just a horizon signal.' },
  { id: 'open', label: 'Open now',  desc: 'Employers see: "Open to conversations now" — signals active interest.' },
];

const TIER_DEFS = [
  { id: 'tier1', tier: 'Tier 1', label: 'Previous matches & employers', desc: 'Companies you\'ve previously matched with or worked at — they already know you.', color: 'teal' },
  { id: 'tier2', tier: 'Tier 2', label: 'DNA + trajectory matches',     desc: 'Employers whose team DNA aligns with yours. Highly curated — typically 8–15 companies.', color: 'violet' },
  { id: 'tier3', tier: 'Tier 3', label: 'All Pro/Enterprise employers',  desc: 'Any employer on a paid Hiro plan — higher visibility, more outreach. Off by default.', color: 'amber' },
];

const TIER_COLORS = {
  teal:   ['rgba(13,148,136,.35)',  'rgba(13,148,136,.07)',  'rgba(13,148,136,.2)',  'rgba(13,148,136,.4)',  'var(--teal)'],
  violet: ['rgba(108,71,255,.3)',   'rgba(108,71,255,.06)',  'rgba(108,71,255,.2)',  'rgba(108,71,255,.4)',  '#a78bfa'],
  amber:  ['var(--border2)',        'rgba(255,255,255,.03)', 'rgba(245,158,11,.15)', 'rgba(245,158,11,.3)',  'var(--amber)'],
};

function horizonLabel(id) {
  const now = new Date();
  const add = { '3mo': 3, '6mo': 6, '12mo': 12, 'open': 0 }[id] || 0;
  if (id === 'open') return 'Open now';
  const d = new Date(now.getFullYear(), now.getMonth() + add, 1);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function seniorityLabel(yrs) {
  if (!yrs) return null;
  if (yrs >= 10) return 'Principal';
  if (yrs >= 7)  return 'Senior';
  if (yrs >= 4)  return 'Mid-level';
  if (yrs >= 1)  return 'Junior';
  return null;
}

export default function CandBench() {
  const { showToast } = useApp();
  const { profile, updateProfile } = useAuth();

  const [joined,   setJoined]   = useState(false);
  const [horizon,  setHorizon]  = useState('6mo');
  const [tiers,    setTiers]    = useState({ tier1: true, tier2: true, tier3: false });
  const [saving,   setSaving]   = useState(false);
  const [stats,    setStats]    = useState({ views: 0, invites: 0 });

  // Hydrate from profile on mount
  useEffect(() => {
    if (!profile) return;
    setJoined(profile.bench_active   ?? false);
    setHorizon(profile.bench_horizon ?? '6mo');
    setTiers(profile.bench_tiers     ?? { tier1: true, tier2: true, tier3: false });
    setStats({
      views:   profile.bench_view_count_week   ?? 0,
      invites: profile.bench_invite_count_week ?? 0,
    });
  }, [profile?.id]);

  async function toggleBench() {
    if (!profile?.id) return;
    const next = !joined;
    setJoined(next);
    setSaving(true);
    try {
      await updateProfile({ bench_active: next, bench_horizon: horizon, bench_tiers: tiers });
      showToast(next ? "You're on The Bench ✔" : 'Removed from The Bench', next ? 'success' : 'default');
    } catch (err) {
      console.error(err);
      setJoined(!next);
      showToast('Failed to update — try again', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function changeHorizon(id) {
    setHorizon(id);
    if (!joined || !profile?.id) return;
    try { await updateProfile({ bench_horizon: id }); } catch (err) { console.error(err); }
  }

  async function toggleTier(id) {
    const next = { ...tiers, [id]: !tiers[id] };
    setTiers(next);
    if (!profile?.id) return;
    try {
      await updateProfile({ bench_tiers: next });
      showToast(`${TIER_DEFS.find(t => t.id === id)?.tier} ${next[id] ? 'enabled' : 'disabled'}`, 'success');
    } catch (err) {
      console.error(err);
      setTiers(tiers);
    }
  }

  // ─ Preview card derivations ─────────────────────────────────────────────────────
  const nameParts      = (profile?.full_name || 'Jordan Mitchell').split(' ');
  const previewInitials = (nameParts[0]?.[0] ?? '') + (nameParts[1]?.[0] ?? '');
  const previewTitle   = profile?.job_title || 'Senior Product Manager';
  const yrs            = profile?.years_experience ?? null;
  const previewYrs     = yrs ? `${yrs} yr${yrs !== 1 ? 's' : ''} exp` : null;
  const seniority      = seniorityLabel(yrs);
  const reliabilityScore = profile?.reliability_score ?? null;
  // DNA match score — stored as dna_match_pct on profile (written by matching engine)
  const dnaMatch       = profile?.dna_match_pct ?? null;
  const previewTags    = [
    profile?.industry        || 'Fintech',
    ...(Array.isArray(profile?.culture_tags) ? profile.culture_tags.slice(0, 2) : []),
    ...(profile?.work_model  ? [profile.work_model]  : []),
    ...(profile?.dna_archetype ? [profile.dna_archetype] : []),
  ].filter(Boolean).slice(0, 4);

  return (
    <div className="scroll">
      <div className="review-shell" style={{ maxWidth: 760 }}>
        <div className="page-hdr" style={{ maxWidth: 760, marginBottom: 20 }}>
          <div>
            <div className="eyebrow">Pre-emptive pipeline · opt-in only</div>
            <div className="page-title">The Bench</div>
          </div>
        </div>

        {/* Hero */}
        <div className="bench-hero" style={{ marginBottom: 16 }}>
          <div style={{ position: 'relative', zIndex: 1 }}>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
              {[
                [stats.views   > 0 ? String(stats.views)   : '—', 'var(--teal)',  'Bench views',       'this week'],
                ['18h',                                              'var(--green)', 'Avg response time',  'from matched employers'],
                [stats.invites > 0 ? String(stats.invites) : '—', '#a78bfa',     'Interview invites',  'sent this week'],
              ].map(([v, c, l, sub]) => (
                <div key={l} style={{ textAlign: 'center', ...(l !== 'Bench views' ? { borderLeft: '1px solid rgba(255,255,255,.07)', borderRight: l === 'Avg response time' ? '1px solid rgba(255,255,255,.07)' : 'none' } : {}) }}>
                  <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 32, fontWeight: 800, color: c, lineHeight: 1, marginBottom: 4 }}>{v}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.4)' }}>{l}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', marginTop: 2 }}>{sub}</div>
                </div>
              ))}
            </div>

            <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 8, lineHeight: 1.3 }}>The best moves go to people who weren&apos;t looking</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', maxWidth: 520, lineHeight: 1.75, marginBottom: 20 }}>Bench candidates are approached before the role is posted — and skip the full interview process 60% of the time. Only companies matching your Work DNA and trajectory can see you’re open. No cold outreach. No inbox spam.</div>

            {/* Testimonials */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
              {[
                { quote: '"I wasn\'t actively looking. Monzo messaged me on a Tuesday and I had an offer by Friday. The whole process was 4 conversations."', initials: 'AM', role: 'Sr PM · Fintech · hired via Bench', grad: 'linear-gradient(135deg,#6c47ff,#a78bfa)' },
                { quote: '"Two companies approached me in the same week. I chose between them — not the other way around. That never happens on LinkedIn."',        initials: 'KR', role: 'Lead Engineer · Crypto · hired via Bench', grad: 'linear-gradient(135deg,#0d9488,#38bdf8)' },
              ].map((t, i) => (
                <div key={i} style={{ padding: '13px 15px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 'var(--rl)' }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', lineHeight: 1.65, marginBottom: 9 }}>{t.quote}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, background: t.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{t.initials}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>{t.role}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Join toggle */}
            <div
              className={`bench-toggle-pill${joined ? ' active' : ' inactive'}`}
              onClick={saving ? undefined : toggleBench}
              style={{ cursor: saving ? 'wait' : 'pointer' }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                  {saving ? 'Saving…' : joined ? "You're on The Bench ✓" : 'Join The Bench'}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>
                  {joined ? 'Matched employers can find you — opt out anytime' : 'Get approached by matched employers — you\'re in control'}
                </div>
              </div>
              <label className="toggle-switch" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={joined} onChange={saving ? undefined : toggleBench} disabled={saving} />
                <span className="toggle-slider" />
              </label>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.2)', textAlign: 'center', marginTop: 8 }}>Opt out anytime · Your name and employer are never shown until you choose to engage</div>
          </div>
        </div>

        {/* Config — revealed after joining */}
        <div style={{ opacity: joined ? 1 : 0.35, pointerEvents: joined ? 'all' : 'none', transition: 'opacity .4s' }}>
          {!joined && (
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.25)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Join The Bench above to configure your settings</span>
            </div>
          )}

          {/* Horizon */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">When would you be open to a conversation?</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14 }}>Shown to employers as a soft signal — not a commitment. Change or remove it anytime.</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {HORIZONS.map(h => (
                <div key={h.id} className={`horizon-btn${horizon === h.id ? ' selected' : ''}`} onClick={() => changeHorizon(h.id)}>{h.label}</div>
              ))}
            </div>
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border2)', fontSize: 12, color: 'var(--text2)' }}>
              {HORIZONS.find(h => h.id === horizon)?.desc}
            </div>
          </div>

          {/* Visibility tiers */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">Who can see you on The Bench</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14 }}>Three-tier system — you control each independently. Start conservative; expand when you&apos;re ready.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TIER_DEFS.map(t => {
                const [border, bg, tierBg, tierBorder, tierColor] = TIER_COLORS[t.color];
                const on = tiers[t.id] ?? false;
                return (
                  <div key={t.id} style={{ padding: '14px 16px', borderRadius: 'var(--r)', border: `1px solid ${border}`, background: bg }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="tier-badge" style={{ background: tierBg, border: `1px solid ${tierBorder}`, color: tierColor }}>{t.tier}</span>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{t.label}</div>
                      </div>
                      <label className="toggle-switch">
                        <input type="checkbox" checked={on} onChange={() => toggleTier(t.id)} />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>{t.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── ENRICHED EMPLOYER PREVIEW CARD ── */}
          <div className="card2" style={{ marginBottom: 14, borderColor: 'rgba(13,148,136,.25)', background: 'linear-gradient(135deg,rgba(13,148,136,.06),rgba(56,189,248,.03))' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--teal)', marginBottom: 12 }}>What matched employers see</div>
            <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: 16 }}>

              {/* Row 1: Avatar + identity */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#0d9488,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                  {previewInitials}
                </div>
                <div style={{ flex: 1 }}>
                  {/* Line 1: Initials · seniority badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15, fontWeight: 800 }}>{previewInitials}.</span>
                    {seniority && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(56,189,248,.12)', border: '1px solid rgba(56,189,248,.25)', color: '#38bdf8' }}>{seniority}</span>
                    )}
                  </div>
                  {/* Line 2: Title + experience */}
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 3 }}>
                    {previewTitle}
                    {previewYrs && <span style={{ color: 'var(--text3)', marginLeft: 6 }}>· {previewYrs}</span>}
                  </div>
                  {/* Line 3: Bench horizon */}
                  <div style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600 }}>
                    On The Bench · {horizon === 'open' ? 'Open now' : `Open from ${horizonLabel(horizon)}`}
                  </div>
                </div>

                {/* Right: DNA % + Reliability */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(167,139,250,.12)', border: '1px solid rgba(167,139,250,.3)', color: '#a78bfa', whiteSpace: 'nowrap' }}>
                    🧬 {dnaMatch !== null ? `${dnaMatch}% match` : 'DNA match'}
                  </span>
                  {reliabilityScore !== null && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.25)', color: 'var(--green)', whiteSpace: 'nowrap' }}>
                      ★ {reliabilityScore} reliability
                    </span>
                  )}
                </div>
              </div>

              {/* Row 2: Tags */}
              {previewTags.length > 0 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                  {previewTags.map(tag => (
                    <span key={tag} className="chip chip-c" style={{ fontSize: 10 }}>{tag}</span>
                  ))}
                </div>
              )}

              {/* Row 3: Footer disclaimer */}
              <div style={{ fontSize: 11, color: 'var(--text3)', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.06)' }}>
                Full name, employer &amp; salary hidden · Full profile unlocks after mutual interest
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 10 }}>Employers express interest — you decide whether to engage. Nothing is revealed without your action.</div>
          </div>
        </div>

        {/* Bottom stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, padding: 16, background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)', borderRadius: 'var(--rl)' }}>
          {[['1,847', 'var(--teal)', 'On The Bench'], ['34%', 'var(--green)', 'Hired in 6 months'], ['9 days', 'var(--cyan)', 'Avg time to hire'], ['60%', '#a78bfa', 'Skip full process']].map(([v, c, l], i) => (
            <div key={l} style={{ textAlign: 'center', ...(i > 0 ? { borderLeft: '1px solid var(--border)' } : {}) }}>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 20, fontWeight: 800, color: c, lineHeight: 1, marginBottom: 3 }}>{v}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{l}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
