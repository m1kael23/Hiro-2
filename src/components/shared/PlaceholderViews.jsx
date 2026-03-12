import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

// Generic placeholder for views not yet fully built
function PlaceholderView({ title, subtitle, icon, buildNote }) {
  const { showToast } = useApp();
  return (
    <div className="view-panel">
      <div className="scroll">
        <div style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
          <div className="page-title" style={{ marginBottom: 8 }}>{title}</div>
          <div className="page-sub" style={{ marginBottom: 24 }}>{subtitle}</div>
          {buildNote && (
            <div style={{
              padding: '12px 16px', borderRadius: 'var(--r)',
              background: 'rgba(108,71,255,0.1)', border: '1px solid rgba(108,71,255,0.3)',
              fontSize: 12, color: '#a78bfa', textAlign: 'left', marginBottom: 20
            }}>
              🔧 <strong>Batch 2+:</strong> {buildNote}
            </div>
          )}
          <button className="btn btn-violet" onClick={() => showToast(`${title} — coming in next batch`, 'default')}>
            Preview data →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Employer views ───────────────────────────────────────────────

export function EmpJobs() {
  const { navigate } = useApp();
  return (
    <div className="view-panel">
      <div className="scroll">
        <div className="page-hdr">
          <div>
            <div className="eyebrow">Active hiring</div>
            <div className="page-title">Job listings</div>
            <div className="page-sub">3 active · 1 draft · 2 closed</div>
          </div>
          <button className="btn btn-violet btn-sm" onClick={() => navigate('emp-create-job')}>+ Post a role</button>
        </div>
        {[
          { title: 'Sr PM — Payments', status: 'live', candidates: 23, matches: 5, salary: '£90–120k', daysLive: 12 },
          { title: 'Lead Engineer', status: 'live', candidates: 18, matches: 2, salary: '£120–150k', daysLive: 8 },
          { title: 'Product Designer', status: 'draft', candidates: 0, matches: 0, salary: '£70–90k', daysLive: 0 },
        ].map(job => (
          <div key={job.title} className="card" style={{ marginBottom: 10, cursor: 'pointer' }}
            onClick={() => navigate('emp-pipeline')}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{job.title}</div>
                  <span className={`status ${job.status === 'live' ? 's-live' : 's-draft'}`}>
                    {job.status === 'live' && <span className="pulse-dot" />} {job.status}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="chip chip-x">London</span>
                  <span className="chip chip-x">{job.salary}</span>
                  <span className="chip chip-x">{job.candidates} candidates</span>
                  <span className="chip chip-g">{job.matches} DNA matches</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{job.daysLive > 0 ? `${job.daysLive}d live` : 'Draft'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmpCreateJob() {
  const { showToast, navigate } = useApp();
  return (
    <div className="view-panel">
      <div className="scroll">
        <div className="page-hdr">
          <div>
            <div className="eyebrow">New listing</div>
            <div className="page-title">Post a role</div>
          </div>
        </div>
        <div style={{ maxWidth: 720 }}>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">Role details</div>
            <div className="g2f">
              <div className="field"><label>Job title</label><input className="inp" placeholder="Sr PM — Payments" /></div>
              <div className="field"><label>Department</label><input className="inp" placeholder="Product" /></div>
            </div>
            <div className="g2f">
              <div className="field"><label>Salary min</label><input className="inp" placeholder="£90,000" /></div>
              <div className="field"><label>Salary max</label><input className="inp" placeholder="£120,000" /></div>
            </div>
            <div className="field"><label>Location</label><input className="inp" placeholder="London, UK (Hybrid)" /></div>
            <div className="field"><label>About the role</label><textarea className="inp textarea" rows={4} placeholder="Describe the role, impact, and what success looks like..." /></div>
          </div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">DNA preferences</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>These shape your Work DNA matching. Leave blank to match broadly.</div>
            {['Energy (Solo → Collaborative)', 'Decisions (Data → Instinct)', 'Rhythm (Async → Real-time)', 'Speed (Deliberate → Fast)'].map(d => (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--text2)', width: 220 }}>{d}</span>
                <input type="range" min={0} max={100} defaultValue={50} style={{ flex: 1 }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => showToast('Saved as draft', 'success')}>Save draft</button>
            <button className="btn btn-violet" onClick={() => { showToast('Role published! Matching started 🚀', 'success'); navigate('emp-jobs'); }}>Publish role →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmpTeamDNA() {
  return <PlaceholderView title="Team DNA" subtitle="Understand your team's collective Work DNA and identify gaps before hiring." icon="🧬" buildNote="Full DNA visualisation, gap analysis, and hire impact modelling — Batch 3" />;
}

export function EmpTracker() {
  return <PlaceholderView title="Hire Tracker" subtitle="Track every hire through onboarding. Monitor health scores and 90-day check-ins." icon="📊" buildNote="Full timeline, health scores, check-in cards — Batch 3" />;
}

export function EmpReviews() {
  return <PlaceholderView title="Reviews" subtitle="Mutual post-hire reviews. Closed system — both sides submit before either can read." icon="⭐" buildNote="Star ratings, dimension breakdown, candidate feedback — Batch 3" />;
}

export function EmpPulse() {
  return <PlaceholderView title="Team Pulse" subtitle="Aggregate wellbeing and engagement signals from your team." icon="💓" buildNote="Pulse quiz, trend charts, retention signals — Batch 4" />;
}

export function EmpCompany() {
  return <PlaceholderView title="Company Profile" subtitle="Your employer brand on Hiro. Candidates research you before applying." icon="🏢" buildNote="Cover, DNA, culture tags, reviews — Batch 3" />;
}

export function EmpGhosting() {
  return <PlaceholderView title="Ghosting Score" subtitle="Your response rate is visible to candidates before they apply." icon="👻" buildNote="Response analytics, ghost log, Hiro Score impact — Batch 3" />;
}

export function EmpPricing() {
  return <PlaceholderView title="Plan & Billing" subtitle="Manage your subscription and usage." icon="💳" buildNote="Plan cards, usage meters, billing — Batch 5" />;
}

export function EmpBench() {
  return <PlaceholderView title="The Bench™" subtitle="Warm talent pool. Candidates who are open to the right opportunity — before they go live." icon="🪑" buildNote="Bench pool, match scores, outreach — Batch 3" />;
}

export function EmpOfferIntel() {
  return <PlaceholderView title="Offer Intel" subtitle="Real-time market data on compensation bands for every role you're hiring." icon="📈" buildNote="Salary benchmarks, equity modeller, negotiation insights — Batch 4" />;
}

export function EmpVault() {
  return <PlaceholderView title="Process Vault™" subtitle="Candidate feedback on your hiring process. Transparent and verified." icon="🔒" buildNote="Themes, flags, individual reports, resolve actions — Batch 3" />;
}

// ── Candidate views ──────────────────────────────────────────────

export function CandHome() {
  const { navigate } = useApp();
  const { profile } = useAuth();
  return (
    <div className="view-panel">
      <div className="scroll">
        <div className="page-hdr">
          <div>
            <div className="eyebrow">Welcome back</div>
            <div className="page-title">{profile?.full_name || 'Jordan Mitchell'}</div>
            <div className="page-sub">{profile?.job_title || 'Senior PM'} · Fintech · London</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-dna btn-sm" onClick={() => navigate('cand-work-dna')}>🧬 Work DNA</button>
            <button className="btn btn-violet btn-sm" onClick={() => navigate('cand-matches')}>My matches →</button>
          </div>
        </div>

        <div className="g4" style={{ marginBottom: 14 }}>
          {[
            { eyebrow: 'New matches', val: '3', label: 'This week', glow: 'rgba(34,197,94,0.25)', color: 'var(--green)' },
            { eyebrow: 'DNA fit avg', val: '91%', label: 'Across matches', glow: 'rgba(236,72,153,0.2)', color: '#f9a8d4' },
            { eyebrow: 'Applications', val: '7', label: '2 in final stage', glow: 'rgba(108,71,255,0.3)', color: '#a78bfa' },
            { eyebrow: 'Reliability', val: '9.1', label: 'Top 8%', glow: 'rgba(56,189,248,0.2)', color: 'var(--cyan)' },
          ].map(s => (
            <div key={s.eyebrow} className="stat-tile" style={{ '--glow': s.glow }}>
              <div className="stat-eyebrow">{s.eyebrow}</div>
              <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="g2">
          <div>
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">Top matches this week</div>
              {[
                { co: 'Monzo', role: 'Sr PM — Payments', score: 94, dna: 91 },
                { co: 'Wise', role: 'Sr PM — Core Payments', score: 92, dna: 89 },
                { co: 'Stripe', role: 'Staff PM — Platform', score: 97, dna: 94 },
              ].map(m => (
                <div key={m.co} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  onClick={() => navigate('cand-matches')}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏦</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.co}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{m.role}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="match-badge">{m.score}%</span>
                    <div style={{ fontSize: 10, color: '#f9a8d4', marginTop: 3 }}>🧬 {m.dna}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="card" style={{ border: '1px solid rgba(236,72,153,0.2)', marginBottom: 12 }}>
              <div className="card-title" style={{ color: '#f9a8d4' }}>🧬 Your Work DNA</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>The Strategist</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.6 }}>Deep focus, data-driven, async-first. You build with rigour.</div>
              <button className="btn btn-sm" style={{ background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.3)', color: '#f9a8d4' }}
                onClick={() => navigate('cand-work-dna')}>View DNA →</button>
            </div>
            <div className="card">
              <div className="card-title">Career pulse</div>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Manrope', color: 'var(--amber)', marginBottom: 4 }}>78<span style={{ fontSize: 12, color: 'var(--text3)' }}>/100</span></div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>Feeling aligned but slightly under-challenged</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('cand-pulse')}>Take pulse →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CandJobs() {
  const { navigate } = useApp();
  return (
    <div className="view-panel">
      <div className="scroll">
        <div className="page-hdr">
          <div>
            <div className="eyebrow">Opportunities</div>
            <div className="page-title">Jobs for you</div>
            <div className="page-sub">Matched to your skills, DNA, and trajectory</div>
          </div>
        </div>
        {[
          { co: 'Monzo', role: 'Sr PM — Payments', salary: '£90–120k', score: 94, dna: 91, tags: ['Fintech', 'Series C', 'London'] },
          { co: 'Stripe', role: 'Staff PM — Platform', salary: '£140–180k', score: 97, dna: 94, tags: ['Developer Tools', 'FAANG-equiv', 'London'] },
          { co: 'Wise', role: 'Sr PM — Core Payments', salary: '£95–130k', score: 92, dna: 89, tags: ['Fintech', 'Series F', 'London'] },
          { co: 'Synthesia', role: 'PM — AI Products', salary: '£85–110k', score: 88, dna: 83, tags: ['AI', 'Series C', 'London'] },
        ].map(job => (
          <div key={job.role} className="card" style={{ marginBottom: 10, cursor: 'pointer' }} onClick={() => navigate('cand-matches')}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏦</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{job.role}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{job.co} · {job.salary}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {job.tags.map(t => <span key={t} className="chip chip-x" style={{ fontSize: 11 }}>{t}</span>)}
                  <span className="match-badge">{job.score}% match</span>
                  <span className="chip chip-p" style={{ fontSize: 11 }}>🧬 {job.dna}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CandMatches() {
  return <PlaceholderView title="My Matches" subtitle="Mutual matches — both you and the employer showed interest." icon="🤝" buildNote="Match detail panel, messaging, express interest — Batch 2" />;
}

export function CandApps() {
  return <PlaceholderView title="Applications" subtitle="Track all your active applications and their current stage." icon="📋" buildNote="Application tracker, stage timeline, offer comparison — Batch 2" />;
}

export function CandMessages() {
  return <PlaceholderView title="Messages" subtitle="Your conversations with matched employers." icon="💬" buildNote="Real-time messaging, thread list, message composer — Batch 4" />;
}

export function CandWorkDNA() {
  return <PlaceholderView title="Work DNA™" subtitle="Your unique work style profile. Psychometrically grounded, not a personality test." icon="🧬" buildNote="Interactive sliders, archetype engine, DNA card export — Batch 2" />;
}

export function CandProfile() {
  return <PlaceholderView title="My Profile" subtitle="Your Hiro profile — what employers see when they match with you." icon="👤" buildNote="Profile editor, experience, skills, preferences — Batch 2" />;
}

export function CandTrajectory() {
  return <PlaceholderView title="Career Trajectory" subtitle="Three paths forward, modelled on your DNA and market data." icon="🗺️" buildNote="Path cards, salary projections, skill gap analysis — Batch 3" />;
}

export function CandBench() {
  return <PlaceholderView title="The Bench™" subtitle="Passively open to the right opportunity. Employers can approach you on your terms." icon="🪑" buildNote="Bench toggle, visibility controls, horizon settings — Batch 3" />;
}

export function CandReviews() {
  return <PlaceholderView title="Reviews" subtitle="Leave and receive verified reviews after completed processes." icon="⭐" buildNote="Review form, submitted reviews, received — Batch 3" />;
}

export function CandGhosting() {
  return <PlaceholderView title="Reliability Score" subtitle="Your professional reputation. Visible to employers after mutual match only." icon="🏆" buildNote="Score ring, breakdown, ghost log — Batch 3" />;
}

export function CandStealth() {
  return <PlaceholderView title="Stealth & Privacy" subtitle="Control exactly who can find you, what they see, and block your current employer." icon="🛡️" buildNote="Stealth toggle, visibility matrix, block list, privacy log — Batch 2" />;
}

export function CandOnboard() {
  return <PlaceholderView title="Onboarding" subtitle="Complete your profile to unlock the full power of Hiro." icon="🚀" buildNote="Multi-step onboarding wizard — Batch 2" />;
}

export function CandOfferIntel() {
  return <PlaceholderView title="Offer Intel" subtitle="Analyse any offer against real market data. Know your number before you negotiate." icon="🧮" buildNote="Offer analyser, equity modeller, counter scripts — Batch 3" />;
}

export function CandPulse() {
  return <PlaceholderView title="Career Pulse" subtitle="A 5-question check-in on how you're really feeling about your career." icon="💓" buildNote="Pulse quiz, history chart, wellbeing insights — Batch 3" />;
}

export function CandVault() {
  return <PlaceholderView title="Interview Vault™" subtitle="Real interview reports from verified candidates. Know what to expect before you walk in." icon="🔐" buildNote="Company vault cards, question bank, submit report — Batch 3" />;
}

export function CandCompany() {
  return <PlaceholderView title="Company Profile" subtitle="Deep-dive on any company: culture, process quality, DNA, and reviews." icon="🏢" buildNote="Company cover, DNA, jobs, reviews, score — Batch 3" />;
}
