
export default function CandOfferIntel() {
  return (
    <div className="scroll">
      <div className="review-shell" style={{ maxWidth: 780 }}>
        <div className="page-hdr" style={{ maxWidth: 780, marginBottom: 18 }}>
          <div>
            <div className="eyebrow">Never negotiate blind again</div>
            <div className="page-title">Offer Intelligence</div>
            <div className="page-sub">Real comp data from verified Hiro hires. See where your offer lands, model your equity, and know exactly what to counter with.</div>
          </div>
        </div>

        {/* Hero */}
        <div className="offer-hero">
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(34,197,94,.8)', marginBottom: 8 }}>Sr PM · Fintech · London · Series C</div>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 12 }}>Market comp for your exact profile</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 14 }}>
                {[['P25', '£88k', 'var(--amber)', 'rgba(255,255,255,.06)', 'rgba(255,255,255,.1)', 'Initial offers'],
                  ['Median', '£105k', 'var(--green)', 'rgba(34,197,94,.12)', 'rgba(34,197,94,.3)', 'Accepted offers'],
                  ['P75', '£128k', 'var(--cyan)', 'rgba(255,255,255,.06)', 'rgba(255,255,255,.1)', 'Top of market']].map(([label, val, color, bg, border, sub]) => (
                  <div key={label} style={{ padding: 12, borderRadius: 'var(--r)', background: bg, border: `1px solid ${border}`, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: `${color}b0`, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 20, fontWeight: 800, color }}>{val}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>{sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>Based on <strong style={{ color: 'rgba(255,255,255,.7)' }}>312 verified offers</strong> accepted on Hiro in the last 12 months · Same role, level, city, and company stage as your profile.</div>
            </div>
            <div style={{ textAlign: 'center', padding: '18px 20px', borderRadius: 'var(--rl)', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'rgba(255,255,255,.35)', marginBottom: 8 }}>Candidates who countered</div>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 44, fontWeight: 800, color: 'var(--green)', lineHeight: 1 }}>84%</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>got more</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', marginTop: 4 }}>Avg uplift: <strong style={{ color: 'var(--green)' }}>£8,400</strong></div>
            </div>
          </div>
        </div>

        {/* Gap insight */}
        <div style={{ padding: '12px 16px', borderRadius: 'var(--r)', background: 'rgba(108,71,255,.08)', border: '1px solid rgba(108,71,255,.25)', fontSize: 12, color: 'var(--text2)', marginBottom: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="ico ico-lightbulb" style={{ width: 15, height: 15, background: 'var(--amber)', flexShrink: 0 }} />
          <div><strong style={{ color: '#a78bfa' }}>Initial offers average £13k below final accepted.</strong> For your profile, the typical negotiation gap is £8–18k on base alone. Equity is negotiated separately — use the analyser below.</div>
        </div>

        {/* Offer analyser */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Analyse your offer</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>Enter your offer details. Hiro benchmarks every component against verified market data.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 14 }}>
            {[['Base salary', 'offerBase', '£95,000'], ['Annual bonus', 'offerBonus', '£10,000'], ['Equity (% options)', 'offerEquity', '0.08%'], ['Company 409A / last round val', 'offerVal', '£400m']].map(([l, id, v]) => (
              <div key={id} className="offer-field"><label>{l}</label><input className="inp" id={id} defaultValue={v} /></div>
            ))}
            <div className="offer-field"><label>Cliff / vest</label><select className="sel"><option>1yr cliff / 4yr vest</option><option>No cliff / 4yr vest</option><option>2yr cliff / 4yr vest</option></select></div>
            <div className="offer-field"><label>Remote days</label><select className="sel"><option>Hybrid 2 days</option><option>Fully remote</option><option>On-site</option></select></div>
          </div>

          <div className="offer-verdict fair">
            <div className="offer-verdict-icon">⚖️</div>
            <div className="offer-verdict-label" style={{ color: 'var(--amber)' }}>Fair — but room to negotiate</div>
            <div className="offer-verdict-msg">Base is £10k below median for your profile. Equity is competitive. Counter on base first — market supports £105–115k for this role.</div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)' }}>
              <span style={{ flex: 1 }}>Component</span><span style={{ width: 80, textAlign: 'right' }}>Your offer</span><span style={{ width: 80, textAlign: 'right' }}>Market P50</span><span style={{ width: 56, textAlign: 'right' }}>Delta</span>
            </div>
            {[
              ['Base salary', '£95,000', '£105,000', '−£10k', 'var(--red)'],
              ['Annual bonus', '£10,000', '£8,500', '+£1.5k', 'var(--green)'],
              ['Equity (0.08%)', 'See below', '0.06% median', '+33%', 'var(--green)'],
              ['Remote premium', 'Hybrid 2d', 'Hybrid typical', 'Neutral', 'var(--amber)'],
            ].map(([l, y, m, d, dc]) => (
              <div key={l} className="offer-comp-row">
                <span className="offer-comp-lbl">{l}</span>
                <span className="offer-comp-your" style={l === 'Equity (0.08%)' ? { color: 'var(--cyan)' } : {}}>{y}</span>
                <span className="offer-comp-mkt">{m}</span>
                <span className="offer-comp-delta" style={{ color: dc }}>{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Equity modeller */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Equity modeller</div>
            <span className="chip chip-v" style={{ fontSize: 10 }}>0.08% at £400m valuation</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14 }}>Three exit scenarios on your current equity. Assumes 1yr cliff / 4yr vest. Pre-dilution estimate.</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            {[
              ['Flat (1×)', '£320k', 'var(--amber)', 'rgba(245,158,11,.3)', 'rgba(245,158,11,.06)', '£400m exit · fully vested'],
              ['Base case (3×)', '£960k', 'var(--cyan)', 'rgba(56,189,248,.3)', 'rgba(56,189,248,.08)', '£1.2bn exit · fully vested'],
              ['Upside (10×)', '£3.2M', 'var(--green)', 'rgba(34,197,94,.3)', 'rgba(34,197,94,.07)', '£4bn exit · fully vested'],
            ].map(([l, v, c, border, bg, sub]) => (
              <div key={l} className="equity-scenario" style={{ borderColor: border, background: bg }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: c, marginBottom: 6 }}>{l}</div>
                <div className="equity-exit-val" style={{ color: c }}>{v}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{sub}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 12px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border2)' }}>⚠ Estimates only. Actual value depends on dilution in future rounds, preference stacks, and exit structure. Always request the full cap table before signing.</div>
        </div>

        {/* Negotiation playbook */}
        <div className="card">
          <div className="card-title">Negotiation playbook · your profile</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14 }}>Based on 312 verified negotiations for this exact role profile on Hiro.</div>
          {[
            ['1️⃣', 'Counter base first.', 'Ask for £110–115k. 84% of candidates who countered base in this range got it. Script: "Based on market data for this role at Series C in London, I was expecting £108–115k. Is there room to move on base?"'],
            ['2️⃣', "Don't touch equity yet.", "Your 0.08% is above market median. Lock the base first — then push for accelerated vesting on a promotion trigger, not more options."],
            ['3️⃣', 'Signing bonus as a fallback.', "If base is truly fixed, 71% of companies in this band offer £5–15k signing to bridge. Ask for it explicitly as an alternative."],
          ].map(([n, bold, rest], i) => (
            <div key={i} className="nego-tip" style={i === 2 ? { marginBottom: 0 } : {}}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{n}</span>
              <div><strong style={{ color: '#a78bfa' }}>{bold}</strong> <em style={{ color: 'var(--text2)' }}>{rest}</em></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
