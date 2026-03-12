import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';

const HORIZONS = [
  { id: '3mo',  label: '3 months', desc: 'Employers see: "Open to conversations from June 2026" — no specific date, just a horizon signal.' },
  { id: '6mo',  label: '6 months', desc: 'Employers see: "Open to conversations from September 2026" — no specific date, just a horizon signal.' },
  { id: '12mo', label: '12 months', desc: 'Employers see: "Open to conversations from March 2027" — no specific date, just a horizon signal.' },
  { id: 'open', label: 'Open now', desc: 'Employers see: "Open to conversations now" — signals active interest.' },
];

const TIER_DEFS = [
  { id: 'tier1', tier: 'Tier 1', label: 'Previous matches & employers', desc: 'Companies you\'ve previously matched with or worked at — they already know you.', countKey: null, color: 'teal' },
  { id: 'tier2', tier: 'Tier 2', label: 'DNA + trajectory matches',     desc: 'Employers whose team DNA aligns with yours. Highly curated — typically 8–15 companies.',  countKey: null, color: 'violet' },
  { id: 'tier3', tier: 'Tier 3', label: 'All Pro/Enterprise employers',  desc: 'Any employer on a paid Hiro plan — higher visibility, more outreach. Off by default.', countKey: null, color: 'amber' },
];

const TIER_COLORS = {
  teal:   ['rgba(13,148,136,.35)',  'rgba(13,148,136,.07)',  'rgba(13,148,136,.2)',  'rgba(13,148,136,.4)',  'var(--teal)'],
  violet: ['rgba(108,71,255,.3)',   'rgba(108,71,255,.06)',  'rgba(108,71,255,.2)',  'rgba(108,71,255,.4)',  '#a78bfa'],
  amber:  ['var(--border2)',        'rgba(255,255,255,.03)', 'rgba(245,158,11,.15)', 'rgba(245,158,11,.3)',  'var(--amber)'],
};

function horizonLabel(id) {
  const now = new Date();
  const add = { '3mo': 3, '6mo': 6, '12mo': 12, 'open': 0 }[id] || 0;
  if (id === 'open') return 'Open to conversations now';
  const d = new Date(now.getFullYear(), now.getMonth() + add, 1);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export default function CandBench() {
  const { showToast } = useApp();
  const { profile, updateProfile } = useAuth();

  const [joined,   setJoined]   = useState(false);
  const [horizon,  setHorizon]  = useState('6mo');
  const [tiers,    setTiers]    = useState({ tier1: true, tier2: true, tier3: false });
  const [saving,   setSaving]   = useState(false);
  const [stats,    setStats]    = useState({ views: 0, invites: 0 });
  const [hydrated, setHydrated] = useState(false);

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
    setHydrated(true);
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
    try {
      await updateProfile({ bench_horizon: id });
    } catch (err) {
      console.error(err);
    }
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

  // Derive anonymised preview values from live profile
  const previewName     = profile?.full_name ? profile.full_name.split(' ')[0][0] + (profile.full_name.split(' ')[1]?.[0] ?? '') : 'JM';
  const previewTitle    = profile?.job_title || 'Senior PM';
  const previewYrs      = profile?.years_experience ? `${profile.years_experience}yr` : '';
  const previewHorizon  = `Open from ${horizonLabel(horizon)}`;
  const previewTags     = [
    profile?.industry || 'Fintech',
    ...(profile?.culture_tags?.slice(0, 2) ?? []),
    ...(profile?.work_model ? [profile.work_model] : []),
  ].slice(0, 4);

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

            {/* Stats — live from profile */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
              {[
                [stats.views   > 0 ? String(stats.views)   : '—', 'var(--teal)',  'Bench views',      'this week'],
                ['18h',                                             'var(--green)', 'Avg response time', 'from matched employers'],
                [stats.invites > 0 ? String(stats.invites) : '—', '#a78bfa',     'Interview invites', 'sent this week'],
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

            {/* Toggle CTA */}
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

          {/* Live anonymised preview */}
          <div className="card2" style={{ marginBottom: 14, borderColor: 'rgba(13,148,136,.25)', background: 'linear-gradient(135deg,rgba(13,148,136,.06),rgba(56,189,248,.03))' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--teal)', marginBottom: 12 }}>What matched employers see</div>
            <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: 14, marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#0d9488,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                  {previewName}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    {previewName}. <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: 12 }}>({previewTitle}{previewYrs ? ` · ${previewYrs}` : ''})</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600 }}>On The Bench · {horizon === 'open' ? 'Open now' : `Open from ${horizonLabel(horizon)}`}</div>
                </div>
                <span className="chip chip-p" style={{ marginLeft: 'auto', fontSize: 10 }}>🧬 DNA match</span>
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {previewTags.map(c => <span key={c} className="chip chip-c" style={{ fontSize: 10 }}>{c}</span>)}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)' }}>Full profile visible only after mutual interest · Salary hidden until match</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Your name, current employer, and salary are never shown. Employers express interest — you decide whether to engage.</div>
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
