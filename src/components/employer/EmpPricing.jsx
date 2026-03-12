import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

/* ─────────────────────────────────────────────
   Feature lists
───────────────────────────────────────────── */
const STARTER_FEATURES = [
  { text: '1 live role',                        yes: true  },
  { text: '25 matched candidates / month',       yes: true  },
  { text: 'Mutual match inbox',                  yes: true  },
  { text: 'Basic company profile',               yes: true  },
  { text: 'Team DNA & culture-fit scoring',      yes: false },
  { text: 'Hire tracker & 90-day check-ins',     yes: false },
  { text: 'Offer Intel market data',             yes: false },
  { text: 'Interview Vault™',                    yes: false },
];

const PRO_FEATURES = [
  'Up to 10 live roles',
  'Unlimited matched candidates',
  '🧬 Team DNA + culture-fit scoring',
  'Hire tracker + 90-day check-ins',
  'DNA coaching on at-risk hires',
  'Offer Intel + live salary benchmarks',
  'Interview Vault™ access',
  'Relocation suite + city intel',
  '5 team seats included',
];

const ENT_FEATURES = [
  'Unlimited live roles',
  'Unlimited team seats',
  'Greenhouse / Ashby / Lever ATS sync',
  'REST API + webhooks',
  'Custom DNA frameworks',
  'Dedicated customer success manager',
  'Priority SLA + onboarding',
  'SSO / SAML + advanced security',
  'Custom invoicing & billing',
];

const COMPARE_ROWS = [
  ['Live roles',                      '1',         '10',          'Unlimited'],
  ['Matched candidates / mo',         '25',        'Unlimited',   'Unlimited'],
  ['Mutual match inbox',              '✓',         '✓',           '✓'],
  ['Company profile',                 'Basic',     'Full',        'Custom'],
  ['Team DNA & culture fit',          '–',         '✓',           '✓'],
  ['Pipeline kanban',                 '–',         '✓',           '✓'],
  ['Hire tracker + check-ins',        '–',         '✓',           '✓'],
  ['Offer Intel market data',         '–',         '✓',           '✓'],
  ['Interview Vault™',                '–',         '✓',           '✓'],
  ['The Bench™ talent pool',          '–',         '✓',           '✓'],
  ['ATS integrations',                '–',         '–',           '✓'],
  ['REST API',                        '–',         '–',           '✓'],
  ['SSO / SAML',                      '–',         '–',           '✓'],
  ['Dedicated CSM',                   '–',         '–',           '✓'],
  ['Team seats',                      '1',         '5',           'Unlimited'],
  ['Support',                         'Community', 'Email',       'Priority SLA'],
];

const FAQS = [
  ['Can I change plans at any time?',
   'Yes — upgrade, downgrade, or cancel any time. No lock-in, no penalties.'],
  ['Is there a free trial for Pro?',
   '14 days free, no card required. Downgrade to Starter or continue at full price at the end.'],
  ["What's included in the free Starter plan?",
   '1 live role and up to 25 matched candidates per month — permanently free, forever.'],
  ["Pro vs Enterprise — what's the real difference?",
   'Enterprise unlocks ATS integrations, REST API, SSO, a dedicated CSM, and custom invoicing for larger teams. Pro is perfect for most growing startups.'],
  ['Do you charge per hire?',
   'Never. Flat monthly subscription — hire 1 or 100 people on the same plan.'],
];

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export default function EmpPricing() {
  const { showToast } = useApp();
  const { profile } = useAuth();

  const [billing,    setBilling]    = useState('monthly');
  const [hireCount,  setHireCount]  = useState(6);
  const [openFaq,    setOpenFaq]    = useState(null);

  /* pricing maths */
  const proMonthly = 299;
  const proAnnual  = 239;
  const price      = billing === 'annual' ? proAnnual : proMonthly;
  const priceLbl   = `£${price}`;
  const billingLbl = billing === 'annual'
    ? `per month · billed £${proAnnual * 12}/yr`
    : 'per month · billed monthly';

  /* ROI */
  const agencyCost = hireCount * 15_000;
  const hiroCost   = (billing === 'annual' ? proAnnual : proMonthly) * 12;
  const saving     = agencyCost - hiroCost;

  /* helpers */
  const fmtGBP = (n) => `£${n.toLocaleString('en-GB')}`;

  const cellColour = (val) => {
    if (val === '✓')  return 'var(--green)';
    if (val === '–')  return 'var(--text3)';
    return 'var(--text2)';
  };

  return (
    <div className="view">
      <div className="scroll">
        <div style={{ maxWidth: 920, paddingBottom: 60 }}>

          {/* ── PAGE HEADER ──────────────────────────────── */}
          <div className="page-hdr" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="eyebrow">No hidden fees · cancel anytime</div>
              <div className="page-title">Plans &amp; pricing</div>
              <div className="page-sub">Flat subscription. Zero per-hire fees. Ever.</div>
            </div>

            {/* billing toggle */}
            <div style={{
              display: 'flex', gap: 3, alignSelf: 'flex-start',
              background: 'rgba(255,255,255,.05)',
              border: '1px solid var(--border2)',
              borderRadius: 'var(--rp)', padding: 3,
            }}>
              {['monthly', 'annual'].map(b => (
                <button
                  key={b}
                  onClick={() => setBilling(b)}
                  style={{
                    padding: '6px 14px', borderRadius: 'var(--rp)',
                    border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, fontFamily: 'Inter',
                    background: billing === b ? 'var(--violet)' : 'transparent',
                    color:      billing === b ? '#fff' : 'var(--text2)',
                    transition: 'all .15s',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  {b === 'monthly' ? 'Monthly' : (
                    <>Annual <span style={{ fontSize: 10, color: billing === 'annual' ? '#a3e635' : 'var(--green)', fontWeight: 700 }}>–20%</span></>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── SOCIAL PROOF STRIP ──────────────────────── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            marginBottom: 24, padding: '10px 16px',
            borderRadius: 'var(--r)',
            background: 'rgba(255,255,255,.03)',
            border: '1px solid var(--border2)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text3)', flexShrink: 0 }}>Trusted by</span>
            {['🏦 Monzo','💳 Wise','🔴 Revolut','🎬 Synthesia','💚 GoCardless', profile?.company_name].filter(Boolean).map(l => (
              <span key={l} style={{
                padding: '2px 10px', borderRadius: 'var(--rp)',
                background: 'rgba(255,255,255,.05)',
                border: '1px solid var(--border2)',
                fontSize: 12, color: 'var(--text2)',
              }}>{l}</span>
            ))}
            <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 2 }}>+ 140 more</span>
          </div>

          {/* ── PLAN CARDS ──────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
            marginBottom: 28,
            alignItems: 'start',
          }}>
            {/* STARTER */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text3)', marginBottom: 10 }}>Starter</div>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 4 }}>£0</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>free forever · no card needed</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1, marginBottom: 22 }}>
                {STARTER_FEATURES.map(f => (
                  <div key={f.text} style={{ display: 'flex', gap: 8, fontSize: 13, color: f.yes ? 'var(--text2)' : 'var(--text3)' }}>
                    <span style={{ fontWeight: 700, color: f.yes ? 'var(--green)' : 'var(--text3)', flexShrink: 0 }}>
                      {f.yes ? '✓' : '–'}
                    </span>
                    {f.text}
                  </div>
                ))}
              </div>
              <button
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => showToast("You&apos;re on the free Starter plan", 'default')}
              >
                Current plan
              </button>
            </div>

            {/* PRO */}
            <div style={{
              borderRadius: 'var(--rl)',
              border: '2px solid var(--violet)',
              background: 'linear-gradient(160deg, rgba(108,71,255,.1), rgba(12,14,26,.99))',
              padding: 20,
              display: 'flex', flexDirection: 'column',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: -12, left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--violet-grad)', color: '#fff',
                fontSize: 10, fontWeight: 800, padding: '3px 14px',
                borderRadius: 999, letterSpacing: '.1em',
                textTransform: 'uppercase', whiteSpace: 'nowrap',
                boxShadow: '0 4px 16px rgba(108,71,255,.5)',
              }}>Most popular</div>

              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: '#a78bfa', marginBottom: 10 }}>Pro</div>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 4 }}>{priceLbl}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.5 }}>{billingLbl}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1, marginBottom: 22 }}>
                {PRO_FEATURES.map(f => (
                  <div key={f} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--green)', flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <button
                className="btn btn-violet"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => showToast('Starting your 14-day Pro trial — no card needed 🚀', 'success')}
              >
                Start 14-day free trial →
              </button>
              <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 8 }}>No card required · cancel anytime</div>
            </div>

            {/* ENTERPRISE */}
            <div className="card" style={{
              display: 'flex', flexDirection: 'column',
              borderColor: 'rgba(56,189,248,.3)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--cyan)', marginBottom: 10 }}>Enterprise</div>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 4 }}>Custom</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>tailored pricing · annual billing</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1, marginBottom: 22 }}>
                {ENT_FEATURES.map(f => (
                  <div key={f} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--green)', flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <button
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'center', borderColor: 'rgba(56,189,248,.3)', color: 'var(--cyan)' }}
                onClick={() => showToast('Our team will be in touch within 24 hours ✓', 'success')}
              >
                Talk to sales →
              </button>
            </div>
          </div>

          {/* ── ROI CALCULATOR ──────────────────────────── */}
          <div className="card" style={{
            marginBottom: 24,
            background: 'linear-gradient(135deg, rgba(108,71,255,.06), rgba(12,14,26,.99))',
            borderColor: 'rgba(108,71,255,.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
              <div className="card-title" style={{ fontSize: 16 }}>💰 ROI calculator</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 18 }}>
              See how much you save compared with a traditional agency at 15% of first-year salary (£100k avg).
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', flexShrink: 0 }}>
                Hires per year:&nbsp;
                <span style={{ color: 'var(--text)', fontWeight: 800, fontSize: 15 }}>{hireCount}</span>
              </label>
              <input
                type="range" min={1} max={20} value={hireCount}
                onChange={e => setHireCount(+e.target.value)}
                style={{ flex: 1, minWidth: 120, accentColor: 'var(--violet)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { label: 'Agency cost',   val: fmtGBP(agencyCost), note: '15% × £100k × hires',     bg: 'rgba(251,113,133,.08)', border: 'rgba(251,113,133,.25)', color: 'var(--red)' },
                { label: 'Hiro Pro cost', val: fmtGBP(hiroCost),   note: 'Annual plan (all hires)',  bg: 'rgba(34,197,94,.08)',   border: 'rgba(34,197,94,.25)',   color: 'var(--green)' },
                { label: 'You save',      val: fmtGBP(saving),     note: 'vs traditional agency',    bg: 'rgba(108,71,255,.1)',   border: 'rgba(108,71,255,.25)',  color: '#a78bfa' },
              ].map(r => (
                <div key={r.label} style={{ textAlign: 'center', padding: '14px 10px', borderRadius: 'var(--r)', background: r.bg, border: `1px solid ${r.border}` }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>{r.label}</div>
                  <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 22, fontWeight: 800, color: r.color }}>{r.val}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{r.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── FULL FEATURE COMPARISON TABLE ───────────── */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-title" style={{ fontSize: 16, marginBottom: 16 }}>Full feature comparison</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl" style={{ minWidth: 500 }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: 200 }}>Feature</th>
                    <th style={{ textAlign: 'center', color: 'var(--text3)' }}>Starter</th>
                    <th style={{ textAlign: 'center', color: '#a78bfa' }}>Pro</th>
                    <th style={{ textAlign: 'center', color: 'var(--cyan)' }}>Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map(([feat, s, p, e]) => (
                    <tr key={feat}>
                      <td style={{ fontWeight: 500, color: 'var(--text2)' }}>{feat}</td>
                      <td style={{ textAlign: 'center', fontSize: 13, color: cellColour(s), fontWeight: s === '✓' ? 700 : 400 }}>{s}</td>
                      <td style={{ textAlign: 'center', fontSize: 13, color: cellColour(p), fontWeight: p === '✓' ? 700 : 400 }}>{p}</td>
                      <td style={{ textAlign: 'center', fontSize: 13, color: cellColour(e), fontWeight: e === '✓' ? 700 : 400 }}>{e}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── FAQ ──────────────────────────────────────── */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-title" style={{ fontSize: 16, marginBottom: 14 }}>Common questions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {FAQS.map(([q, a], i) => (
                <div
                  key={q}
                  style={{
                    borderRadius: 'var(--r)',
                    border: '1px solid var(--border)',
                    background: openFaq === i ? 'rgba(108,71,255,.04)' : 'transparent',
                    overflow: 'hidden',
                    transition: 'background .15s',
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{
                      width: '100%', padding: '12px 14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      border: 'none', background: 'none', cursor: 'pointer',
                      fontFamily: 'Inter', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{q}</span>
                    <span style={{
                      color: 'var(--text3)', fontSize: 18, flexShrink: 0, marginLeft: 12,
                      transform: openFaq === i ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform .2s',
                      display: 'inline-block',
                    }}>›</span>
                  </button>
                  {openFaq === i && (
                    <div style={{ padding: '0 14px 14px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                      {a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── BOTTOM CTA BANNER ────────────────────────── */}
          <div style={{
            padding: '28px 32px',
            borderRadius: 'var(--rl)',
            background: 'linear-gradient(135deg, rgba(108,71,255,.14), rgba(13,148,136,.1))',
            border: '1px solid rgba(108,71,255,.25)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
                Ready to try Pro free for 14 days?
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                No card required. Cancel or downgrade to Starter any time.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <button
                className="btn btn-violet"
                onClick={() => showToast('Starting your 14-day Pro trial 🚀', 'success')}
              >
                Start free trial →
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => showToast('Our team will reach out within 24 hours', 'default')}
              >
                Talk to sales
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
