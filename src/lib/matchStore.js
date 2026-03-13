/**
 * ═══════════════════════════════════════════════════════════════
 *  HIRO — Match Store  v1.0
 *
 *  Single source of truth for:
 *   - JOB_CATALOGUE       — all jobs with real DNA requirements
 *   - CANDIDATE_POOL      — all candidates with real DNA vectors
 *   - scoreJob(cand, job) — live score computation via dnaEngine
 *   - scoreCandidate()    — employer side (candidate vs job)
 *   - getJobsForCandidate()
 *   - getCandidatesForJob()
 *
 *  All scores are COMPUTED — never hardcoded.
 *  Import this instead of scattering static numbers across views.
 * ═══════════════════════════════════════════════════════════════
 */

import { calcOverallMatchScore, getArchetype, getDnaLabel, DNA_DIMENSIONS } from './dnaEngine';

// ─────────────────────────────────────────────────────────────────
//  DEFAULT CANDIDATE  (neutral baseline for scoring only — no personal data)
//  Do NOT use this for display. Gate UI on profile !== null instead.
//  DNA: [energy, decision, feedback, rhythm, autonomy, risk, growth]
// ─────────────────────────────────────────────────────────────────
export const DEFAULT_CANDIDATE = {
  id:        'self',
  dna:       [50, 50, 50, 50, 50, 50, 50],
  skills:    [],
  salaryMin: 0,
  salaryMax: 999,
};

// ─────────────────────────────────────────────────────────────────
//  JOB CATALOGUE
//  dnaPrefs: null = employer didn't set (skip that dim in scoring)
//  DNA dims: [energy, decision, feedback, rhythm, autonomy, risk, growth]
// ─────────────────────────────────────────────────────────────────
export const JOB_CATALOGUE = [
  {
    id: 'monzo-pm',
    emoji: '🏦',
    co: 'Monzo',
    title: 'Sr PM — Payments',
    salary: '£90–120k',
    salaryMin: 90, salaryMax: 120,
    location: 'London',
    remote: 'Hybrid',
    stage: 'Series C',
    hiroScore: 9.1,
    responseRate: 94,
    daysLive: 3,
    applicants: 29,
    avgDays: 14,
    dnaMembers: '4 members ✓',
    outcome: 'Own the full Payments product roadmap for 9M+ customers, leading PSD2 compliance and embedded finance.',
    skillsRequired: ['Product Management', 'Fintech', 'Payments', 'SQL', 'OKRs'],
    skillsNice: ['PSD2', 'Roadmapping', 'Stakeholder management'],
    dnaPrefs: [30, 20, 40, 25, 35, 55, 50],
    // Monzo: focused, data-driven, balanced comms, async-first, moderate autonomy
    teamDna: [32, 22, 45, 28, 40, 52, 48],
    tags: ['Fintech', 'Series C', 'London', '🧬 DNA verified'],
    mutual: true,
  },
  {
    id: 'stripe-pm',
    emoji: '💳',
    co: 'Stripe',
    title: 'Staff PM — Platform',
    salary: '£140–180k',
    salaryMin: 140, salaryMax: 180,
    location: 'London',
    remote: 'Remote',
    stage: 'Late stage',
    hiroScore: 8.8,
    responseRate: 82,
    daysLive: 8,
    applicants: 41,
    avgDays: 21,
    dnaMembers: '6 members ✓',
    outcome: 'Define the product strategy for Stripe\'s developer platform, used by 3M+ businesses globally.',
    skillsRequired: ['Product Management', 'B2B SaaS', 'SQL', 'Stakeholder management'],
    skillsNice: ['Developer Tools', 'API Products', 'Data Analysis'],
    dnaPrefs: [20, 15, 38, 18, 22, 45, 38],
    // Stripe: very deep focus, very data-driven, async-first, high autonomy
    teamDna: [22, 18, 40, 20, 24, 48, 35],
    tags: ['Developer Tools', 'Late-stage', 'Remote', '🧬 DNA verified'],
    mutual: false,
  },
  {
    id: 'wise-pm',
    emoji: '🌍',
    co: 'Wise',
    title: 'Sr PM — International',
    salary: '£95–130k',
    salaryMin: 95, salaryMax: 130,
    location: 'London / Remote',
    remote: 'Remote',
    stage: 'Public',
    hiroScore: 8.5,
    responseRate: 88,
    daysLive: 1,
    applicants: 14,
    avgDays: 18,
    dnaMembers: '3 members ✓',
    outcome: 'Lead internationalisation of Wise\'s core product across 5 new markets, owning activation and retention.',
    skillsRequired: ['Product Management', 'Payments', 'Fintech', 'OKRs'],
    skillsNice: ['SQL', 'Growth', 'B2B SaaS'],
    dnaPrefs: [38, 28, 48, 35, 45, 50, 45],
    teamDna: [40, 30, 50, 38, 42, 52, 48],
    tags: ['Fintech', 'Public', 'Remote'],
    mutual: false,
  },
  {
    id: 'synthesia-pm',
    emoji: '🎬',
    co: 'Synthesia',
    title: 'PM — AI Products',
    salary: '£85–110k',
    salaryMin: 85, salaryMax: 110,
    location: 'London',
    remote: 'Hybrid',
    stage: 'Series C',
    hiroScore: 8.2,
    responseRate: 91,
    daysLive: 5,
    applicants: 22,
    avgDays: 11,
    dnaMembers: '5 members ✓',
    outcome: 'Shape Synthesia\'s AI video product roadmap, working directly with the founding team.',
    skillsRequired: ['Product Management', 'B2B SaaS', 'Growth'],
    skillsNice: ['AI/ML', 'Data Analysis', 'Stakeholder management'],
    dnaPrefs: [55, 48, 50, 55, 60, 75, 62],
    // Synthesia: collaborative, balanced decisions, real-time, high risk appetite
    teamDna: [58, 50, 52, 58, 62, 78, 65],
    tags: ['AI', 'Series C', 'London'],
    mutual: true,
  },
  {
    id: 'revolut-pm',
    emoji: '💜',
    co: 'Revolut',
    title: 'Principal PM — Growth',
    salary: '£145–175k',
    salaryMin: 145, salaryMax: 175,
    location: 'London',
    remote: 'Office',
    stage: 'Post-IPO',
    hiroScore: 7.4,
    responseRate: 79,
    daysLive: 5,
    applicants: 68,
    avgDays: 28,
    dnaMembers: '8 members ✓',
    outcome: 'Own growth strategy for Revolut\'s 40M+ user base, leading a team of 4 PMs.',
    skillsRequired: ['Product Management', 'Growth', 'SQL', 'Stakeholder management'],
    skillsNice: ['Payments', 'Fintech', 'OKRs'],
    dnaPrefs: [65, 55, 35, 65, 40, 72, 68],
    // Revolut: fast-moving, instinct-forward, direct, sync, high risk
    teamDna: [68, 58, 32, 68, 38, 75, 70],
    tags: ['Fintech', 'Post-IPO', 'London', 'Office'],
    mutual: false,
  },
  {
    id: 'gocardless-pm',
    emoji: '💚',
    co: 'GoCardless',
    title: 'Sr PM — Platform',
    salary: '£100–130k',
    salaryMin: 100, salaryMax: 130,
    location: 'London',
    remote: 'Hybrid',
    stage: 'Series F',
    hiroScore: 8.9,
    responseRate: 92,
    daysLive: 12,
    applicants: 18,
    avgDays: 16,
    dnaMembers: '4 members ✓',
    outcome: 'Lead the platform product for GoCardless\'s bank debit network, used by 85,000+ businesses.',
    skillsRequired: ['Product Management', 'B2B SaaS', 'Fintech', 'Roadmapping'],
    skillsNice: ['Payments', 'SQL', 'OKRs', 'Stakeholder management'],
    dnaPrefs: [35, 25, 42, 28, 38, 48, 44],
    teamDna: [38, 28, 45, 30, 40, 50, 46],
    tags: ['Fintech', 'Series F', 'Hybrid', 'London'],
    mutual: false,
  },
  {
    id: 'wayflyer-pm',
    emoji: '🛒',
    co: 'Wayflyer',
    title: 'Head of Product',
    salary: '£110–140k + equity',
    salaryMin: 110, salaryMax: 140,
    location: 'Dublin',
    remote: 'Hybrid',
    stage: 'Series B',
    hiroScore: 7.4,
    responseRate: 78,
    daysLive: 5,
    applicants: 17,
    avgDays: 28,
    dnaMembers: '3 members ✓',
    outcome: 'First dedicated Head of Product at Wayflyer — define the product org from scratch.',
    skillsRequired: ['Product Management', 'Fintech', 'Roadmapping'],
    skillsNice: ['B2B SaaS', 'Growth', 'OKRs'],
    dnaPrefs: [50, 45, 45, 45, 65, 78, 55],
    teamDna: [52, 48, 48, 48, 68, 80, 58],
    tags: ['Fintech', 'Series B', 'Dublin', 'Equity'],
    mutual: false,
  },
];

// ─────────────────────────────────────────────────────────────────
//  CANDIDATE POOL  (employer side — shown in Pipeline / Candidates)
//  DNA: [energy, decision, feedback, rhythm, autonomy, risk, growth]
// ─────────────────────────────────────────────────────────────────
export const CANDIDATE_POOL = [
  {
    id: 'michael-silva',
    initials: 'MS', grad: 'linear-gradient(135deg,#6c47ff,#4338ca)',
    name: 'Michael Silva', role: 'Senior Product Manager', exp: '8yr',
    location: 'London', reloc: false,
    salary: '£95–120k', notice: '1 month',
    skills: ['Product Management', 'Fintech', 'Payments', 'SQL', 'OKRs', 'Roadmapping', 'Stakeholder management'],
    dna: [65, 25, 45, 32, 58, 62, 50],
    reliability: 98, vaultCount: 12,
    trajectory: 'Fast Track — Head of Product in 2yr',
    workExp: [
      { co: 'Revolut', role: 'Senior PM — Growth', period: '2022–Present', yrs: '2yr', desc: 'Led growth initiatives for the core banking product, driving a 25% increase in user activation.', chips: [{ c: 'chip-g', l: 'Fintech' }, { c: 'chip-v', l: 'Growth' }] },
      { co: 'Wise', role: 'Product Manager', period: '2019–2022', yrs: '3yr', desc: 'Owned the international transfers experience for the APAC region.', chips: [{ c: 'chip-v', l: 'Payments' }] },
      { co: 'Monzo', role: 'Associate PM', period: '2017–2019', yrs: '2yr', desc: 'Supported the card operations team in scaling customer support tools.', chips: [{ c: 'chip-c', l: 'Operations' }] },
    ],
  }
];

// ─────────────────────────────────────────────────────────────────
//  SCORING FUNCTIONS  (thin wrappers around dnaEngine)
// ─────────────────────────────────────────────────────────────────

/**
 * scoreJobForCandidate(candidate, job) → { overall, dna, skills, salaryFit, breakdown }
 *
 * Used in: CandJobs, CandMatches, CandHome
 */
export function scoreJobForCandidate(candidate, job) {
  const candDna = candidate?.dna || [50, 50, 50, 50, 50, 50, 50];
  const candSkills = candidate?.skills || [];

  const { overall, dna, skills } = calcOverallMatchScore(
    { dna: candDna, skills: candSkills },
    { dna: job.dnaPrefs, skillsRequired: job.skillsRequired, skillsNice: job.skillsNice }
  );

  // Salary fit — bonus/penalty on top
  const candMid = ((candidate?.salaryMin || 90) + (candidate?.salaryMax || 140)) / 2;
  const jobMid  = ((job.salaryMin || job.salMin || 0) + (job.salaryMax || job.salMax || 0)) / 2;
  const salaryDelta = Math.abs(candMid - jobMid);
  const salaryFit = salaryDelta <= 15 ? 'great' : salaryDelta <= 35 ? 'ok' : 'stretch';

  // Salary-adjusted overall
  const salaryBonus = salaryFit === 'great' ? 2 : salaryFit === 'ok' ? 0 : -4;
  const adjustedOverall = Math.min(99, Math.max(50, overall + salaryBonus));

  // Per-dimension breakdown for detail panel
  const breakdown = job.dnaPrefs ? job.dnaPrefs.map((pref, i) => {
    if (pref == null) return null;
    const candVal = candDna[i] ?? 50;
    const dist    = Math.abs(candVal - pref);
    const fit     = Math.round(Math.max(0, 1 - dist / 22) * 100);
    return {
      dim:     DNA_DIMENSIONS[i]?.label,
      icon:    DNA_DIMENSIONS[i]?.icon,
      candVal,
      jobVal:  pref,
      fit,
      label:   getDnaLabel(i, candVal),
    };
  }).filter(Boolean) : [];

  return { overall: adjustedOverall, dna, skills, salaryFit, breakdown };
}

/**
 * scoreCandidateForJob(candidate, job) → { overall, dna, skills, archetype, dnaNote }
 *
 * Used in: EmpCandidates, EmpPipeline
 */
export function scoreCandidateForJob(candidate, job) {
  const scores = scoreJobForCandidate(candidate, job);

  const archetype = getArchetype(candidate.dna);

  // Auto-generate DNA note
  const topGaps = scores.breakdown
    .filter(b => b && b.fit < 70)
    .sort((a, b) => a.fit - b.fit)
    .slice(0, 2);

  let dnaNote = `${archetype.name} — ${scores.dna}% DNA alignment with the team's working style.`;
  if (topGaps.length > 0) {
    dnaNote += ` It is worth discussing ${topGaps.map(g => g.dim?.toLowerCase()).join(' and ')} in the interview.`;
  }

  const dnaWarn = topGaps.length > 0
    ? `${topGaps[0].dim}: the team scores ${topGaps[0].jobVal}, while the candidate scores ${topGaps[0].candVal}. Discuss working norms explicitly.`
    : null;

  return { ...scores, archetype, dnaNote, dnaWarn };
}

/**
 * getJobsForCandidate(candidate) → jobs sorted by overall match score
 */
export function getJobsForCandidate(candidate = DEFAULT_CANDIDATE) {
  return JOB_CATALOGUE
    .map(job => ({
      ...job,
      scores: scoreJobForCandidate(candidate, job),
    }))
    .sort((a, b) => b.scores.overall - a.scores.overall);
}

/**
 * getCandidatesForJob(job, candidates) → candidates sorted by overall match score
 */
export function getCandidatesForJob(job, candidates = CANDIDATE_POOL) {
  return candidates
    .map(c => ({
      ...c,
      scores: scoreCandidateForJob(c, job),
    }))
    .sort((a, b) => b.scores.overall - a.scores.overall);
}

/**
 * getScoreColour(score) → CSS colour string
 */
export function getScoreColour(score) {
  if (score >= 88) return 'var(--green)';
  if (score >= 75) return '#a78bfa';
  if (score >= 60) return 'var(--amber)';
  return 'var(--red)';
}

/**
 * getScoreLabel(score) → short label
 */
export function getScoreLabel(score) {
  if (score >= 92) return 'Exceptional fit';
  if (score >= 85) return 'Strong fit';
  if (score >= 75) return 'Good fit';
  if (score >= 60) return 'Possible fit';
  return 'Low fit';
}
