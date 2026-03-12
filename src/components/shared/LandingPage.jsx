import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

// ─────────────────────────────────────────────────────────────────
//  DATA
// ─────────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Build your Work DNA™',
    body: 'A 7-minute psychometric profile — not a personality test. We map how you work: energy, decision style, feedback preference, rhythm, autonomy, risk appetite, and growth mode.',
    icon: '🧬',
    color: '#ec4899',
    glow: 'rgba(236,72,153,.2)',
  },
  {
    step: '02',
    title: 'Get matched — not spammed',
    body: 'Our algorithm surfaces roles where your DNA fits the team, not just your CV keywords. Mutual interest only — no cold applications into the void.',
    icon: '⚡',
    color: '#6c47ff',
    glow: 'rgba(108,71,255,.2)',
  },
  {
    step: '03',
    title: 'Move fast, stay in control',
    body: 'Real salary data upfront. Full interview process transparency. Anti-ghosting protection. If an employer goes silent, Hiro flags it and your Ghosting Score updates publicly.',
    icon: '🛡️',
    color: '#38bdf8',
    glow: 'rgba(56,189,248,.2)',
  },
  {
    step: '04',
    title: 'Track your career, not just your job',
    body: 'Trajectory modelling, Pulse check-ins, The Bench™ for passive opportunities. Hiro stays useful long after you&apos;ve landed — it&apos;s a career OS, not a job board.',
    icon: '🗺️',
    color: '#22c55e',
    glow: 'rgba(34,197,94,.2)',
  },
];

const VS_TABLE = [
  { feature: 'Salary transparency',         hiro: '✓ Always upfront',    linkedin: 'Sometimes',  indeed: 'Rarely',   lever: '✗' },
  { feature: 'Culture / DNA matching',       hiro: '✓ Psychometric',     linkedin: 'Partial',    indeed: '✗',        lever: 'Partial' },
  { feature: 'Anti-ghosting protection',     hiro: '✓ Scored & public',  linkedin: '✗',          indeed: '✗',        lever: '✗' },
  { feature: 'Stealth mode',                 hiro: '✓ Built-in',         linkedin: 'Limited',    indeed: '✗',        lever: '✗' },
  { feature: 'Offer intelligence',           hiro: '✓ Real-time data',   linkedin: 'Limited',    indeed: 'Limited',  lever: '✗' },
  { feature: 'Process transparency',         hiro: '✓ Vault™ reports',   linkedin: '✗',          indeed: '✗',        lever: '✗' },
  { feature: 'Career trajectory tools',      hiro: '✓ Included',         linkedin: 'Partial',    indeed: '✗',        lever: '✗' },
  { feature: 'Passive talent pool',          hiro: '✓ The Bench™',       linkedin: 'Partial',    indeed: '✗',        lever: 'Partial' },
  { feature: 'No ads or data selling',       hiro: '✓ Always',           linkedin: '✗',          indeed: '✗',        lever: '✓' },
  { feature: 'Per-hire fees for employers',  hiro: '✓ Never',            linkedin: '✗',          indeed: '✗',        lever: '✗' },
];

const FEATURES_CANDIDATE = [
  { icon: '🧬', title: 'Work DNA™',         body: 'Psychometric matching on 7 work-style dimensions. Get matched on how you actually work, not just what you&apos;ve done.' },
  { icon: '🛡️', title: 'Stealth Mode',      body: 'Your current employer can&apos;t see you&apos;re looking. Granular privacy controls — hide your name, salary, or go fully invisible.' },
  { icon: '👻', title: 'Ghost Protection',  body: 'Employers who ghost candidates get a public Ghosting Score. Accountability, finally.' },
  { icon: '🧮', title: 'Offer Intel',       body: 'Analyse any offer against verified market data. Know your number before you negotiate. Equity modeller included.' },
  { icon: '🪑', title: 'The Bench™',        body: 'Not actively looking? Join The Bench and let the right roles find you — before they&apos;re posted publicly.' },
  { icon: '🗺️', title: 'Career Trajectory', body: 'Three paths forward, modelled on your DNA and market data. Skill gap analysis included.' },
];

const FEATURES_EMPLOYER = [
  { icon: '⚡', title: 'DNA Matching',       body: 'Match candidates on culture fit, not just skills. Team DNA mapping shows you exactly how a new hire changes your team dynamic.' },
  { icon: '📊', title: 'Pipeline Kanban',    body: 'Visual pipeline with stage tracking, response timers, and auto-nudges. Never let a candidate go stale.' },
  { icon: '📈', title: 'Offer Intelligence', body: 'Real-time comp benchmarking for every role. See where your band lands vs market before you lose candidates to better offers.' },
  { icon: '🔒', title: 'Process Vault™',     body: 'Candidate feedback on your hiring process — verified and blind. Fix problems before they hurt your Hiro Score.' },
  { icon: '🪑', title: 'The Bench™',         body: 'Access warm talent who are passively open. Approach before you post. Skip 60% of the interview process on average.' },
  { icon: '🚫', title: 'Zero Per-Hire Fees', body: 'Flat monthly subscription. Hire 1 or 100 people on the same plan. No credits, no surprises.' },
];

const TESTIMONIALS = [
  { name: 'Jordan M.',   role: 'Sr PM · Fintech · London',       initials: 'JM', grad: 'linear-gradient(135deg,#6c47ff,#4338ca)', quote: 'I&apos;d been quietly miserable for 18 months. Hiro matched me to a role I didn&apos;t even know to search for. The Work DNA thing is genuinely uncanny — my new team works exactly like I do.' },
  { name: 'Sarah K.',    role: 'Head of Talent · Series B',       initials: 'SK', grad: 'linear-gradient(135deg,#ec4899,#be185d)', quote: 'We reduced time-to-hire by 40% and our 90-day retention went from 68% to 91%. The DNA matching is the real deal. We stopped hiring for CVs and started hiring for fit.' },
  { name: 'Marcus W.',   role: 'Lead Engineer · Scale-up',        initials: 'MW', grad: 'linear-gradient(135deg,#38bdf8,#0284c7)', quote: 'Got 3 Bench approaches in my first week. Accepted one — skipped the take-home test entirely because the match score was so high. It was the easiest interview of my career.' },
  { name: 'Priya N.',    role: 'Talent Partner · VC-backed',      initials: 'PN', grad: 'linear-gradient(135deg,#22c55e,#15803d)', quote: 'The ghosting score changed our team culture immediately. Knowing it&apos;s public made everyone respond faster. We went from 55% response rate to 94% in 6 weeks.' },
  { name: 'Tom R.',      role: 'Product Designer · Remote',       initials: 'TR', grad: 'linear-gradient(135deg,#f59e0b,#d97706)', quote: 'Stealth mode is the feature I didn&apos;t know I needed. Found a new role without my current employer ever knowing I was looking. Zero awkwardness.' },
  { name: 'Aisha B.',    role: 'Engineering Manager · Fintech',   initials: 'AB', grad: 'linear-gradient(135deg,#a78bfa,#7c3aed)', quote: 'The Offer Intel tool alone was worth it. I countered £12k above the initial offer because I had the data to back it up. They met me almost exactly.' },
];

const PLANS = [
  {
    tier: 'Candidate',
    price: 'Free',
    period: 'always',
    desc: 'Everything you need to find work that actually fits.',
    feats: [
      'Work DNA™ profile',
      'Unlimited job matches',
      'Stealth mode',
      'Offer Intel & equity modeller',
      'Career Trajectory mapping',
      'The Bench™ access',
      'Ghost protection',
      'Interview Vault™',
    ],
    cta: 'Get started free →',
    style: 'ghost',
    role: 'candidate',
    highlight: false,
  },
  {
    tier: 'Employer — Starter',
    price: 'Free',
    period: 'forever',
    desc: '1 live role, 25 matches/month. No card required.',
    feats: [
      '1 live role',
      '25 matched candidates / month',
      'Mutual match inbox',
      'Basic company profile',
    ],
    cta: 'Start free →',
    style: 'ghost',
    role: 'employer',
    highlight: false,
  },
  {
    tier: 'Employer — Pro',
    price: '£299',
    period: '/ month',
    desc: 'Everything you need to hire well. No per-hire fees. Ever.',
    feats: [
      'Up to 10 live roles',
      'Unlimited matched candidates',
      '🧬 Team DNA + culture-fit scoring',
      'Pipeline kanban + hire tracker',
      'Offer Intel + live salary benchmarks',
      'Interview Vault™ access',
      'The Bench™ talent pool',
      '5 team seats included',
    ],
    cta: 'Start 14-day free trial →',
    style: 'violet',
    role: 'employer',
    highlight: true,
    badge: 'Most popular',
  },
  {
    tier: 'Employer — Scale',
    price: '£1,499',
    period: '/ month',
    desc: 'For scaling teams hiring 10+ roles per year.',
    feats: [
      'Unlimited live roles',
      'ATS / API integrations',
      'Custom DNA frameworks',
      'Dedicated customer success manager',
      'Priority SLA',
      'SSO / SAML',
      'Custom invoicing',
      'Unlimited team seats',
    ],
    cta: 'Talk to sales →',
    style: 'ghost',
    role: 'employer',
    highlight: false,
  },
];

const STATS = [
  { val: '12,840+', label: 'Active candidates',        color: '#6c47ff', glow: 'rgba(108,71,255,.25)' },
  { val: '94%',     label: 'Match accuracy rate',       color: '#22c55e', glow: 'rgba(34,197,94,.25)' },
  { val: '40%',     label: 'Faster time-to-hire',       color: '#38bdf8', glow: 'rgba(56,189,248,.25)' },
  { val: '£0',      label: 'Per-hire fees. Ever.',       color: '#ec4899', glow: 'rgba(236,72,153,.25)' },
];

const FOOTER_COLS = {
  Product:  ['How it works', 'Pricing', 'The Bench™', 'Work DNA™', 'API docs'],
  Company:  ['About us', 'Careers', 'Press kit', 'Partners', 'Contact'],
  Legal:    ['Privacy policy', 'Terms of service', 'Cookie policy', 'GDPR requests', 'Accessibility'],
};

const FOOTER_LEGAL_ROUTES = {
  'Privacy policy':   'legal-privacy',
  'Terms of service': 'legal-terms',
  'Cookie policy':    'legal-cookies',
};

// ─────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────

function vsStyle(val) {
  if (!val) return {};
  if (val.startsWith('✓'))                                  return { color: '#22c55e', fontWeight: 700 };
  if (val === '✗')                                          return { color: '#fb7185', opacity: 0.7 };
  if (['Sometimes', 'Partial', 'Rarely', 'Limited'].includes(val)) return { color: '#f59e0b' };
  return {};
}

// ─────────────────────────────────────────────────────────────────
//  COMPONENT
// ─────────────────────────────────────────────────────────────────

export default function LandingPage({ onLogin, onSignup }) {
  const { navigate } = useApp();
  const [scrolled,        setScrolled]        = useState(false);
  const [cookieDismissed, setCookieDismissed] = useState(false);
  const [featureTab,      setFeatureTab]      = useState('candidate'); // 'candidate' | 'employer'
  const [billingCycle,    setBillingCycle]    = useState('monthly');   // 'monthly' | 'annual'
  const rootRef = useRef(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 16);
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // ── Design tokens ───────────────────────────────────────────────
  const T = {
    violet:     '#6c47ff',
    violetLt:   'rgba(108,71,255,.12)',
    violetMd:   'rgba(108,71,255,.35)',
    violetGrad: 'linear-gradient(135deg,#6c47ff,#4338ca)',
    cyan:       '#38bdf8',
    green:      '#22c55e',
    amber:      '#f59e0b',
    red:        '#fb7185',
    pink:       '#ec4899',
    text:       '#e8e9f4',
    text2:      '#9899b0',
    text3:      '#5a5b72',
    border:     'rgba(255,255,255,.07)',
    border2:    'rgba(255,255,255,.13)',
    surface:    'rgba(14,17,36,.95)',
    bg:         '#06070f',
    r:          '14px',
    rl:         '20px',
    rx:         '28px',
    rp:         '999px',
  };

  const btnViolet = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '11px 24px', borderRadius: T.rp, border: 'none',
    background: T.violetGrad, color: '#fff',
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'Manrope, system-ui, sans-serif',
    boxShadow: '0 8px 32px rgba(108,71,255,.4)',
    transition: 'filter .18s, transform .18s',
    whiteSpace: 'nowrap',
    letterSpacing: '-0.01em',
  };

  const btnGhost = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '11px 24px', borderRadius: T.rp,
    border: `1px solid ${T.border2}`,
    background: 'rgba(255,255,255,.05)', color: T.text2,
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'Manrope, system-ui, sans-serif',
    transition: 'background .15s, color .15s, border-color .15s',
    whiteSpace: 'nowrap',
    letterSpacing: '-0.01em',
  };

  const proMonthly = 299;
  const proAnnual  = Math.round(proMonthly * 0.8); // 20% off annual
  const proPrice   = billingCycle === 'annual' ? proAnnual : proMonthly;

  return (
    <div
      ref={rootRef}
      style={{
        position: 'fixed', inset: 0,
        overflowY: 'auto', overflowX: 'hidden',
        background: T.bg,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: T.text,
        zIndex: 8000,
        scrollBehavior: 'smooth',
      }}
    >
      {/* ═══════════════════════════════════════════════════════
          NAV
      ═══════════════════════════════════════════════════════ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 200,
        height: 64, display: 'flex', alignItems: 'center',
        padding: '0 32px', gap: 0,
        background: scrolled ? 'rgba(6,7,15,.97)' : 'rgba(6,7,15,.6)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: scrolled ? `1px solid ${T.border}` : '1px solid transparent',
        transition: 'background .25s, border-color .25s',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto', cursor: 'pointer' }}
          onClick={() => rootRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: T.violetGrad,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Manrope, sans-serif', fontSize: 16, fontWeight: 800, color: '#fff',
            boxShadow: '0 4px 16px rgba(108,71,255,.5)',
          }}>H</div>
          <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 20, fontWeight: 800, letterSpacing: '-0.05em', color: T.text }}>hiro</span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 2, marginRight: 20 }}>
          {[['How it works', 'lp-how'], ['vs LinkedIn', 'lp-vs'], ['Features', 'lp-features'], ['Pricing', 'lp-pricing'], ['About', 'lp-about']].map(([label, id]) => (
            <button key={id} onClick={() => scrollTo(id)} style={{
              padding: '6px 12px', borderRadius: T.rp, border: 'none',
              background: 'none', color: T.text3, fontSize: 13, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'color .15s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = T.text}
              onMouseLeave={e => e.currentTarget.style.color = T.text3}
            >{label}</button>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...btnGhost, padding: '7px 16px', fontSize: 13 }} onClick={onLogin}>Log in</button>
          <button style={{ ...btnViolet, padding: '7px 18px', fontSize: 13, boxShadow: '0 4px 16px rgba(108,71,255,.4)' }} onClick={() => onSignup('candidate')}>Get started free →</button>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════ */}
      <section style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '80px 24px 100px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glows */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 90% 60% at 50% -5%, rgba(108,71,255,.28) 0, transparent 65%),
            radial-gradient(ellipse 50% 40% at 10% 90%, rgba(13,148,136,.18) 0, transparent 55%),
            radial-gradient(ellipse 45% 35% at 90% 80%, rgba(236,72,153,.14) 0, transparent 55%)
          `,
        }} />

        {/* Floating stat pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 16px 6px 8px', borderRadius: T.rp,
          background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)',
          marginBottom: 28, fontSize: 12, fontWeight: 600, color: T.green,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.green, display: 'inline-block', animation: 'pulse 2s infinite' }} />
          12,840+ professionals · Live matching now
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: 'clamp(36px, 7vw, 80px)',
          fontWeight: 800,
          letterSpacing: '-0.05em',
          lineHeight: 1.05,
          maxWidth: 860,
          marginBottom: 22,
          color: T.text,
        }}>
          The career OS that matches on{' '}
          <span style={{ background: T.violetGrad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            who you are
          </span>
          , not just what you did
        </h1>

        <p style={{
          fontSize: 'clamp(15px, 2vw, 19px)', color: T.text2,
          maxWidth: 600, lineHeight: 1.7, marginBottom: 40,
        }}>
          Hiro matches candidates and employers on Work DNA™ — 7 psychometric dimensions
          that predict culture fit, not just CV keywords. No ghosting. Salary upfront. Always.
        </p>

        {/* CTA row */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56 }}>
          <button style={{ ...btnViolet, padding: '14px 32px', fontSize: 15 }} onClick={() => onSignup('candidate')}>
            Get started free — I&apos;m a candidate →
          </button>
          <button style={{ ...btnGhost, padding: '14px 32px', fontSize: 15 }} onClick={() => onSignup('employer')}>
            I&apos;m hiring →
          </button>
        </div>

        {/* Trust badges */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            ['🛡️ SOC 2 Type II', T.green, 'rgba(34,197,94,.08)', 'rgba(34,197,94,.2)'],
            ['🇬🇧 UK GDPR', T.green, 'rgba(34,197,94,.08)', 'rgba(34,197,94,.2)'],
            ['🔒 ISO 27001', '#a78bfa', 'rgba(108,71,255,.08)', 'rgba(108,71,255,.2)'],
            ['🚫 Never sells data', T.cyan, 'rgba(56,189,248,.08)', 'rgba(56,189,248,.2)'],
            ['💳 No card to start', T.amber, 'rgba(245,158,11,.08)', 'rgba(245,158,11,.2)'],
          ].map(([label, col, bg, border]) => (
            <span key={label} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: T.rp,
              background: bg, border: `1px solid ${border}`,
              fontSize: 12, fontWeight: 600, color: col,
            }}>{label}</span>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          STATS BAND
      ═══════════════════════════════════════════════════════ */}
      <section style={{
        padding: '48px 28px',
        background: 'rgba(255,255,255,.015)',
        borderTop: `1px solid ${T.border}`,
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{
          maxWidth: 1080, margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 32,
        }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: 'clamp(32px, 5vw, 52px)',
                fontWeight: 800,
                letterSpacing: '-0.05em',
                color: s.color,
                lineHeight: 1,
                marginBottom: 8,
                filter: `drop-shadow(0 0 20px ${s.glow})`,
              }}>{s.val}</div>
              <div style={{ fontSize: 14, color: T.text3, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          HOW IT WORKS
      ═══════════════════════════════════════════════════════ */}
      <section id="lp-how" style={{ padding: '100px 28px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: T.violet, marginBottom: 12 }}>How it works</div>
            <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.04em', color: T.text, marginBottom: 14 }}>
              A job search built for humans
            </h2>
            <p style={{ fontSize: 16, color: T.text2, maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
              Four steps. No spray-and-pray. No keyword roulette. Just roles that fit.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} style={{
                borderRadius: T.rl,
                padding: '28px 24px',
                background: 'rgba(14,17,36,.9)',
                border: `1px solid ${T.border}`,
                position: 'relative',
                overflow: 'hidden',
                transition: 'border-color .2s, transform .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = step.color.replace(')', ', .4)').replace('rgb', 'rgba'); e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{
                  position: 'absolute', top: -20, right: -20,
                  width: 100, height: 100, borderRadius: '50%',
                  background: step.glow, filter: 'blur(30px)',
                  pointerEvents: 'none',
                }} />
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', color: T.text3, marginBottom: 12 }}>{step.step}</div>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{step.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 10, fontFamily: 'Manrope, sans-serif' }}>{step.title}</div>
                <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.7 }}>{step.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          VS TABLE
      ═══════════════════════════════════════════════════════ */}
      <section id="lp-vs" style={{ padding: '100px 28px', background: 'rgba(255,255,255,.01)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: T.violet, marginBottom: 12 }}>Why Hiro</div>
            <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.04em', color: T.text, marginBottom: 14 }}>
              Built for 2026, not 2006
            </h2>
            <p style={{ fontSize: 16, color: T.text2, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
              Every other job platform was designed for the era of newspaper listings. We weren&apos;t.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: T.text3, borderBottom: `1px solid ${T.border}` }}>Feature</th>
                  {['Hiro', 'LinkedIn', 'Indeed', 'Lever'].map((col, i) => (
                    <th key={col} style={{
                      padding: '12px 16px', textAlign: 'center',
                      fontSize: 12, fontWeight: 700, color: i === 0 ? T.violet : T.text3,
                      borderBottom: `1px solid ${i === 0 ? 'rgba(108,71,255,.4)' : T.border}`,
                      background: i === 0 ? 'rgba(108,71,255,.06)' : 'transparent',
                      borderRadius: i === 0 ? '8px 8px 0 0' : 0,
                    }}>{col}{i === 0 && <span style={{ marginLeft: 5, fontSize: 9, padding: '2px 6px', background: T.violetGrad, color: '#fff', borderRadius: T.rp }}>✦ new</span>}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {VS_TABLE.map((row, ri) => (
                  <tr key={row.feature} style={{ background: ri % 2 === 0 ? 'rgba(255,255,255,.015)' : 'transparent' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: T.text2, borderBottom: `1px solid ${T.border}` }}>{row.feature}</td>
                    {[row.hiro, row.linkedin, row.indeed, row.lever].map((val, ci) => (
                      <td key={ci} style={{
                        padding: '12px 16px', textAlign: 'center', fontSize: 12,
                        borderBottom: `1px solid ${ci === 0 ? 'rgba(108,71,255,.15)' : T.border}`,
                        background: ci === 0 ? 'rgba(108,71,255,.04)' : 'transparent',
                        ...vsStyle(val),
                      }}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FEATURES — TABBED
      ═══════════════════════════════════════════════════════ */}
      <section id="lp-features" style={{ padding: '100px 28px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: T.violet, marginBottom: 12 }}>Features</div>
            <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.04em', color: T.text, marginBottom: 14 }}>
              Everything you need, nothing you don&apos;t
            </h2>
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 48 }}>
            <div style={{
              display: 'inline-flex', gap: 4, padding: 4,
              background: 'rgba(255,255,255,.04)', border: `1px solid ${T.border}`,
              borderRadius: T.rp,
            }}>
              {[['candidate', '👤 For Candidates'], ['employer', '🏢 For Employers']].map(([key, label]) => (
                <button key={key} onClick={() => setFeatureTab(key)} style={{
                  padding: '8px 20px', borderRadius: T.rp, border: 'none',
                  background: featureTab === key ? T.violetGrad : 'transparent',
                  color: featureTab === key ? '#fff' : T.text3,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all .2s',
                  boxShadow: featureTab === key ? '0 4px 16px rgba(108,71,255,.35)' : 'none',
                }}>{label}</button>
              ))}
            </div>
          </div>

          {/* Feature grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {(featureTab === 'candidate' ? FEATURES_CANDIDATE : FEATURES_EMPLOYER).map(f => (
              <div key={f.title} style={{
                padding: '24px', borderRadius: T.rl,
                background: 'rgba(14,17,36,.9)', border: `1px solid ${T.border}`,
                transition: 'border-color .2s, transform .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.border2; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 8, fontFamily: 'Manrope, sans-serif' }}>{f.title}</div>
                <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.7 }}>{f.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          TESTIMONIALS
      ═══════════════════════════════════════════════════════ */}
      <section style={{ padding: '100px 28px', background: 'rgba(255,255,255,.01)', borderTop: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: T.violet, marginBottom: 12 }}>Real people, real outcomes</div>
            <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.04em', color: T.text }}>
              What happens when hiring works
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={{
                background: 'rgba(14,17,36,.9)', border: `1px solid ${T.border}`,
                borderRadius: T.rl, padding: '24px',
                transition: 'border-color .2s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.border2}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
              >
                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.75, marginBottom: 20 }}>
                  <span style={{
                    fontFamily: 'Manrope, sans-serif', fontSize: 36, fontWeight: 800,
                    color: T.violetMd, lineHeight: 0.4, verticalAlign: -12, marginRight: 3,
                  }}>&ldquo;</span>
                  {t.quote}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 11,
                    background: t.grad,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
                  }}>{t.initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: T.text3 }}>{t.role}</div>
                  </div>
                  <div style={{ fontSize: 11, flexShrink: 0, opacity: 0.7 }}>⭐⭐⭐⭐⭐</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          PRICING
      ═══════════════════════════════════════════════════════ */}
      <section id="lp-pricing" style={{ padding: '100px 28px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: T.violet, marginBottom: 12 }}>Pricing</div>
            <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.04em', color: T.text, marginBottom: 12 }}>
              No surprises. No per-hire fees. Ever.
            </h2>
            <p style={{ fontSize: 16, color: T.text2, maxWidth: 520, margin: '0 auto 28px', lineHeight: 1.7 }}>
              Candidates are always free. Employers pay a flat subscription.
            </p>

            {/* Billing toggle */}
            <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: 'rgba(255,255,255,.04)', border: `1px solid ${T.border}`, borderRadius: T.rp }}>
              {[['monthly', 'Monthly'], ['annual', 'Annual · save 20%']].map(([key, label]) => (
                <button key={key} onClick={() => setBillingCycle(key)} style={{
                  padding: '7px 16px', borderRadius: T.rp, border: 'none',
                  background: billingCycle === key ? T.violetGrad : 'transparent',
                  color: billingCycle === key ? '#fff' : T.text3,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', transition: 'all .2s',
                }}>{label}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, alignItems: 'start' }}>
            {PLANS.map(p => {
              const displayPrice = (p.tier === 'Employer — Pro' && billingCycle === 'annual') ? `£${proPrice}` : p.price;
              return (
                <div key={p.tier} style={{
                  borderRadius: T.rx, padding: '28px 24px',
                  border: p.highlight ? `2px solid ${T.violet}` : `1px solid ${T.border}`,
                  background: p.highlight
                    ? 'linear-gradient(160deg, rgba(108,71,255,.1), rgba(6,7,15,.99))'
                    : 'rgba(14,17,36,.9)',
                  display: 'flex', flexDirection: 'column',
                  position: 'relative',
                  transition: 'transform .2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {p.badge && (
                    <div style={{
                      position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                      background: T.violetGrad, color: '#fff',
                      fontSize: 10, fontWeight: 800, padding: '3px 14px',
                      borderRadius: T.rp, whiteSpace: 'nowrap',
                      boxShadow: '0 4px 16px rgba(108,71,255,.5)',
                    }}>{p.badge}</div>
                  )}
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: p.highlight ? '#a78bfa' : T.text3, marginBottom: 10 }}>{p.tier}</div>
                  <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 42, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, color: T.text, marginBottom: 4 }}>
                    {displayPrice}
                    <span style={{ fontSize: 13, fontWeight: 500, color: T.text3 }}> {p.period}</span>
                  </div>
                  {p.tier === 'Employer — Pro' && billingCycle === 'annual' && (
                    <div style={{ fontSize: 11, color: T.green, marginBottom: 6, fontWeight: 600 }}>✓ Billed £{proPrice * 12}/yr · save £{(proMonthly - proPrice) * 12}</div>
                  )}
                  <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.6, marginBottom: 20, minHeight: 48 }}>{p.desc}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1, marginBottom: 24 }}>
                    {p.feats.map(f => (
                      <div key={f} style={{ display: 'flex', gap: 8, fontSize: 13, color: T.text2 }}>
                        <span style={{ color: T.green, fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => p.tier === 'Employer — Scale' ? null : onSignup(p.role)}
                    style={p.highlight ? { ...btnViolet, width: '100%', justifyContent: 'center' } : { ...btnGhost, width: '100%', justifyContent: 'center' }}
                  >{p.cta}</button>
                </div>
              );
            })}
          </div>

          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: T.text3 }}>
            All plans include a 14-day free trial for employer tiers. No card required to start.{' '}
            <span style={{ color: T.text2, cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
              onClick={() => scrollTo('lp-pricing')}>Compare all features →</span>
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          ABOUT
      ═══════════════════════════════════════════════════════ */}
      <section id="lp-about" style={{ padding: '100px 28px', background: 'rgba(255,255,255,.01)', borderTop: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: T.violet, marginBottom: 16 }}>About Hiro</div>
          <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-0.04em', color: T.text, marginBottom: 20 }}>
            We built the job platform we always wanted
          </h2>
          <p style={{ fontSize: 15, color: T.text2, lineHeight: 1.8, marginBottom: 16 }}>
            LinkedIn was built for the age of newspaper classifieds. Indeed optimised for volume, not fit. Glassdoor reviews got gamed. We decided to start over.
          </p>
          <p style={{ fontSize: 15, color: T.text2, lineHeight: 1.8, marginBottom: 16 }}>
            Hiro is a Career OS — a platform that stays useful whether you&apos;re actively looking, passively open, or just tracking your trajectory. We use psychometric Work DNA™ matching to surface roles where you&apos;ll actually thrive, not just survive.
          </p>
          <p style={{ fontSize: 15, color: T.text2, lineHeight: 1.8, marginBottom: 32 }}>
            We&apos;re based in Lisbon, built by a team who&apos;s been ghosted, underpaid, and mismatched too many times. We&apos;re fixing it — one match at a time.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button style={btnViolet} onClick={() => onSignup('candidate')}>Join as candidate →</button>
            <button style={btnGhost} onClick={() => onSignup('employer')}>Post a role →</button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════════════ */}
      <section style={{
        padding: '100px 28px',
        textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(108,71,255,.18) 0, transparent 70%)',
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 800, letterSpacing: '-0.04em', color: T.text, marginBottom: 16 }}>
            Ready to find your match?
          </h2>
          <p style={{ fontSize: 17, color: T.text2, lineHeight: 1.7, marginBottom: 36 }}>
            Join 12,840+ professionals who ditched keyword roulette for roles that actually fit.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button style={{ ...btnViolet, padding: '14px 32px', fontSize: 15, background: '#fff', color: '#06070f', boxShadow: 'none' }}
              onClick={() => onSignup('candidate')}>Get started — it&apos;s free →</button>
            <button style={{ ...btnGhost, padding: '14px 32px', fontSize: 15, borderColor: 'rgba(255,255,255,.2)', color: 'rgba(255,255,255,.7)' }}
              onClick={() => onSignup('employer')}>I&apos;m hiring →</button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════ */}
      <footer style={{ background: 'rgba(4,5,12,.99)', borderTop: `1px solid ${T.border}`, padding: '56px 28px 28px' }}>
        <div style={{
          maxWidth: 1080, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: 40, marginBottom: 48,
        }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: T.violetGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>H</div>
              <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 16, fontWeight: 800, letterSpacing: '-0.04em', color: T.text }}>hiro</span>
            </div>
            <p style={{ fontSize: 13, color: T.text3, lineHeight: 1.7, maxWidth: 220, marginBottom: 18 }}>
              The career OS that matches on who you are, not just what you did.
            </p>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {[
                ['🛡️ SOC 2', T.green, 'rgba(34,197,94,.08)', 'rgba(34,197,94,.2)'],
                ['🇬🇧 GDPR', T.green, 'rgba(34,197,94,.08)', 'rgba(34,197,94,.2)'],
                ['🔒 ISO 27001', '#a78bfa', 'rgba(108,71,255,.08)', 'rgba(108,71,255,.2)'],
              ].map(([l, col, bg, br]) => (
                <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: T.rp, background: bg, border: `1px solid ${br}`, fontSize: 10, fontWeight: 600, color: col }}>{l}</span>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_COLS).map(([col, links]) => (
            <div key={col}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: T.text3, marginBottom: 14 }}>{col}</div>
              {links.map(l => (
                <div
                  key={l}
                  style={{ fontSize: 13, color: T.text3, marginBottom: 10, cursor: 'pointer', transition: 'color .15s' }}
                  onClick={() => FOOTER_LEGAL_ROUTES[l] ? navigate(FOOTER_LEGAL_ROUTES[l]) : null}
                  onMouseEnter={e => e.currentTarget.style.color = T.text2}
                  onMouseLeave={e => e.currentTarget.style.color = T.text3}
                >{l}</div>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          maxWidth: 1080, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
          borderTop: `1px solid ${T.border}`, paddingTop: 22,
          fontSize: 12, color: T.text3,
        }}>
          <span>© 2026 Hiro Technologies Ltd. Registered in England &amp; Wales. No. 14812749.</span>
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              { label: 'Privacy',  route: 'legal-privacy'  },
              { label: 'Terms',    route: 'legal-terms'    },
              { label: 'Cookies',  route: 'legal-cookies'  },
            ].map(({ label, route }) => (
              <span
                key={label}
                style={{ cursor: 'pointer', transition: 'color .15s' }}
                onClick={() => navigate(route)}
                onMouseEnter={e => e.currentTarget.style.color = T.text2}
                onMouseLeave={e => e.currentTarget.style.color = T.text3}
              >{label}</span>
            ))}
          </div>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════
          COOKIE BANNER
      ═══════════════════════════════════════════════════════ */}
      {!cookieDismissed && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
          background: 'rgba(8,10,20,.98)',
          borderTop: `1px solid ${T.border2}`,
          padding: '16px 28px',
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}>
          <span style={{ flex: 1, minWidth: 220, fontSize: 13, color: T.text2, lineHeight: 1.6 }}>
            🍪 We use essential cookies for authentication and optional analytics to improve Hiro.{' '}
            <span
              style={{ color: T.cyan, cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
              onClick={() => navigate('legal-cookies')}
            >Cookie policy</span>
            {' '}·{' '}
            <span
              style={{ color: T.cyan, cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
              onClick={() => navigate('legal-privacy')}
            >Privacy policy</span>
            . Your data is never sold.
          </span>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button style={{ ...btnGhost, padding: '7px 16px', fontSize: 12 }} onClick={() => setCookieDismissed(true)}>Essential only</button>
            <button style={{ ...btnViolet, padding: '7px 16px', fontSize: 12, boxShadow: 'none' }} onClick={() => setCookieDismissed(true)}>Accept all</button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          PULSE KEYFRAME (for the live dot animation)
      ═══════════════════════════════════════════════════════ */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(1.4); }
        }
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&display=swap');
      `}</style>
    </div>
  );
}
