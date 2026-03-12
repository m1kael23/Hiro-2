/**
 * ═══════════════════════════════════════════════════════════════
 *  HIRO — Work DNA™ Engine  v2.0
 *  Core IP — pure JS, no framework deps
 *  Used by: CandWorkDNA, OnboardingView, EmpTeamDNA,
 *           EmpCreateJob, matching algorithm, Supabase scoring
 * ═══════════════════════════════════════════════════════════════
 *
 *  DNA is a 7-number array [d0, d1, d2, d3, d4, d5, d6]
 *  Each value: 0–100 (slider position)
 *
 *  Dimension map:
 *    0 — Energy style       (Deep focus ↔ Collaborative)
 *    1 — Decision style     (Data-driven ↔ Instinct-led)
 *    2 — Feedback style     (Direct ↔ Diplomatic)
 *    3 — Work rhythm        (Async-first ↔ Sync/real-time)
 *    4 — Autonomy           (High autonomy ↔ Structured/guided)
 *    5 — Risk appetite      (Risk-averse ↔ Risk-tolerant)
 *    6 — Growth driver      (Mastery ↔ Impact/recognition)
 */

// ─────────────────────────────────────────────────────────────────
//  DIMENSIONS  (source of truth — used in sliders + job creation)
// ─────────────────────────────────────────────────────────────────
export const DNA_DIMENSIONS = [
  {
    id: 0,
    num: 'Dimension 1',
    label: 'Energy style',
    icon: '⚡',
    left: 'Deep focus',
    right: 'Collaborative',
    leftDesc: 'Long uninterrupted blocks, solo problem-solving',
    rightDesc: 'Energy from people, workshops, cross-functional work',
    labels: [
      'Pure deep focus — long solo work blocks, minimal meetings',
      'Focus-first with collaborative bursts when needed',
      'Balanced — deep work + energised by cross-functional sprints',
      'Mostly collaborative, short focus blocks',
      'Fully collaborative — thrives in group problem-solving',
    ],
  },
  {
    id: 1,
    num: 'Dimension 2',
    label: 'Decision style',
    icon: '🧠',
    left: 'Data-driven',
    right: 'Instinct-led',
    leftDesc: 'Metrics, experiments, and evidence before action',
    rightDesc: 'Pattern recognition, intuition, fast decisions',
    labels: [
      'Strongly data-first — defines metrics before building, runs A/B tests',
      'Data-leaning — research first, instinct to confirm',
      'Balanced — mixes quantitative rigour with gut feel',
      'Instinct-leaning — reads signals, moves fast, validates after',
      'Pure instinct-led — trusts pattern recognition, questions metrics culture',
    ],
  },
  {
    id: 2,
    num: 'Dimension 3',
    label: 'Feedback style',
    icon: '💬',
    left: 'Direct',
    right: 'Diplomatic',
    leftDesc: 'Blunt, clear, no softening — values efficiency',
    rightDesc: 'Reads the room, careful with delivery, relationship-first',
    labels: [
      'Blunt and direct — says exactly what they mean, always',
      'Mostly direct — honest but picks moments',
      'Balanced communicator — direct but diplomatic when it counts',
      'Diplomatic-leaning — thoughtful delivery, avoids conflict',
      'Deeply diplomatic — relationship-preserving above all',
    ],
  },
  {
    id: 3,
    num: 'Dimension 4',
    label: 'Work rhythm',
    icon: '🔄',
    left: 'Async-first',
    right: 'Sync / real-time',
    leftDesc: 'Loom, Notion, deep work windows, no-meeting defaults',
    rightDesc: 'Slack, standups, quick calls, real-time collaboration',
    labels: [
      'Async-first — Notion/Loom over calls, protected deep work windows',
      'Async-leaning — defaults to written communication, calls for complex',
      'Balanced — adapts to team norms, comfortable either way',
      'Sync-leaning — prefers quick calls, energy from real-time interaction',
      'Fully synchronous — thrives in high-cadence real-time environments',
    ],
  },
  {
    id: 4,
    num: 'Dimension 5',
    label: 'Autonomy',
    icon: '🎯',
    left: 'High autonomy',
    right: 'Structured',
    leftDesc: 'Defines own scope, self-directs, minimal oversight needed',
    rightDesc: 'Clear structure, regular check-ins, defined ownership',
    labels: [
      'Maximum autonomy — defines own scope, uncomfortable with micro-management',
      'High autonomy — needs clear outcomes, not instructions',
      'Balanced — thrives with direction on goals, freedom on approach',
      'Structured-leaning — regular check-ins, clear role definitions',
      'Highly structured — detailed briefs, frequent feedback, clear hierarchy',
    ],
  },
  {
    id: 5,
    num: 'Dimension 6',
    label: 'Risk appetite',
    icon: '🔥',
    left: 'Risk-averse',
    right: 'Risk-tolerant',
    leftDesc: 'Prefers proven paths, stability, incremental change',
    rightDesc: 'Comfortable with ambiguity, 0→1, uncharted territory',
    labels: [
      'Risk-averse — stability first, prefers proven approaches and clear roadmaps',
      'Cautiously optimistic — calculated risks with strong mitigation',
      'Balanced — comfortable with managed risk and change',
      'Risk-tolerant — energised by ambiguity and new territory',
      'High risk appetite — thrives in 0→1, unstructured, uncertain environments',
    ],
  },
  {
    id: 6,
    num: 'Dimension 7',
    label: 'Growth driver',
    icon: '🚀',
    left: 'Mastery',
    right: 'Impact',
    leftDesc: 'World-class craft, depth over breadth',
    rightDesc: 'Outcome scale, legacy, visible change in the world',
    labels: [
      'Pure mastery — depth is everything, excellence in craft above all',
      'Mastery-leaning — skill development drives satisfaction',
      'Balanced — grows through craft and seeing outcomes',
      'Impact-leaning — energised by scale and visible results',
      'Pure impact — legacy, scale, and mission over personal skill metrics',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────
//  ARCHETYPES  (8 types — condition tested in order)
// ─────────────────────────────────────────────────────────────────
export const DNA_ARCHETYPES = [
  {
    id: 'pioneer',
    name: 'The Pioneer',
    emoji: '🚀',
    gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)',
    color: '#fbbf24',
    desc: 'A first-principles thinker who questions every assumption, moves fast, and thrives at the edge of what is known. Ambiguity isn\'t a problem — it\'s the signal they\'re in the right place. They tend to get bored when the map is already drawn.',
    traits: ['Instinct-led', 'Risk-tolerant', 'High autonomy', 'Impact-driven'],
    bestFit: ['Seed', 'Series A', 'Founder-mode teams'],
    watchOut: 'Can struggle in highly structured environments or late-stage orgs where process > speed.',
    condition: (v) => v[1] > 58 && v[5] > 62 && v[4] < 55,
  },
  {
    id: 'strategist',
    name: 'The Strategist',
    emoji: '🎯',
    gradient: 'linear-gradient(135deg,#6c47ff,#38bdf8)',
    color: '#a78bfa',
    desc: 'Does their best work with data, space to think, and a well-defined problem. Rigorous by default, they build things that last and grow fastest when they own a domain end-to-end. They are the person people come to when the answer isn\'t obvious.',
    traits: ['Data-driven', 'Deep focus', 'Async-first', 'Mastery-motivated'],
    bestFit: ['Series B–D', 'Complex products', 'Research-heavy orgs'],
    watchOut: 'May over-index on analysis in fast-moving environments. Watch for analysis paralysis.',
    condition: (v) => v[0] < 50 && v[1] < 45 && v[3] < 50,
  },
  {
    id: 'architect',
    name: 'The Architect',
    emoji: '🏗️',
    gradient: 'linear-gradient(135deg,#0d9488,#6c47ff)',
    color: '#2dd4bf',
    desc: 'A systems thinker who builds things that scale. Async-first, data-driven, and often prefers written documentation over meetings. They think in leverage — what one decision unlocks ten others.',
    traits: ['Async-first', 'Data-driven', 'Systems thinker', 'Autonomy-driven'],
    bestFit: ['Platform teams', 'Infrastructure', 'Scale-ups with technical debt'],
    watchOut: 'Can underestimate the human/political side of org design. Strong opinions held loosely.',
    condition: (v) => v[1] < 40 && v[3] < 40 && v[4] < 50,
  },
  {
    id: 'catalyst',
    name: 'The Catalyst',
    emoji: '⚡',
    gradient: 'linear-gradient(135deg,#ec4899,#f97316)',
    color: '#f9a8d4',
    desc: 'Sparks energy in every room. Collaborative, fast-moving, and instinct-led — they thrive when things are moving fast and decisions need to happen now. They bring teams to life and ship through people.',
    traits: ['Collaborative', 'Instinct-led', 'Real-time', 'Impact-driven'],
    bestFit: ['Go-to-market', 'Growth', 'Series A–C sprints'],
    watchOut: 'Can underinvest in documentation or process. "We\'ll figure it out" energy is high.',
    condition: (v) => v[0] > 58 && v[1] > 52 && v[3] > 58,
  },
  {
    id: 'connector',
    name: 'The Connector',
    emoji: '🌐',
    gradient: 'linear-gradient(135deg,#22c55e,#0d9488)',
    color: '#86efac',
    desc: 'A people-first leader who bridges gaps, builds trust across teams, and makes culture tangible. Diplomatic in feedback, they are energised by collaboration and have an unusual ability to move a room to alignment.',
    traits: ['Collaborative', 'Diplomatic', 'People-first', 'Impact-driven'],
    bestFit: ['Cross-functional PM', 'People ops', 'Enterprise sales', 'Partnerships'],
    watchOut: 'Conflict avoidance can slow hard decisions. Being the diplomat in every room is tiring.',
    condition: (v) => v[0] > 55 && v[2] > 55,
  },
  {
    id: 'craftsperson',
    name: 'The Craftsperson',
    emoji: '🔨',
    gradient: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
    color: '#c4b5fd',
    desc: 'Excellence is non-negotiable. They care deeply about the quality of their output — not vanity quality, but genuine craft. They are drawn to hard problems that require taste, precision, and iterative refinement.',
    traits: ['Mastery-driven', 'Deep focus', 'High standards', 'Intrinsic motivation'],
    bestFit: ['IC tracks', 'Design', 'Engineering', 'Research'],
    watchOut: 'Can be hard to move from "done" to "shipped". Perfect can be the enemy of good enough.',
    condition: (v) => v[6] < 35 && v[0] < 45,
  },
  {
    id: 'operator',
    name: 'The Operator',
    emoji: '⚙️',
    gradient: 'linear-gradient(135deg,#f59e0b,#22c55e)',
    color: '#fcd34d',
    desc: 'Execution is their superpower. They take ambiguous mandates and turn them into systems, processes, and results. Reliable, structured, and incredibly effective at scale — they are the person who makes things actually happen.',
    traits: ['Structured', 'Delivery-focused', 'Process-builder', 'Team multiplier'],
    bestFit: ['Operations', 'Chief of Staff', 'Series C+ delivery', 'Scale-up chaos'],
    watchOut: 'Can default to "how" before questioning "what". Needs strong strategic context to work with.',
    condition: (v) => v[4] > 58 && v[5] < 45,
  },
  {
    id: 'explorer',
    name: 'The Explorer',
    emoji: '🧭',
    gradient: 'linear-gradient(135deg,#38bdf8,#22c55e)',
    color: '#7dd3fc',
    desc: 'Breadth is their edge. Curious across domains, they connect dots others miss. They are energised by new problems, new contexts, and the feeling of figuring something out from scratch. Best in roles that need range.',
    traits: ['Curious', 'Adaptive', 'Cross-domain', 'Growth-oriented'],
    bestFit: ['Generalist roles', 'Early-stage', 'New product lines', 'Consulting'],
    watchOut: 'Can struggle to go deep when depth is what\'s needed. "Shiny object" risk is real.',
    condition: () => true, // fallback
  },
];

// ─────────────────────────────────────────────────────────────────
//  CORE FUNCTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * getArchetype(dna: number[7]) → archetype object
 * Returns the first archetype whose condition is satisfied.
 */
export function getArchetype(dna) {
  if (!dna || !Array.isArray(dna)) return DNA_ARCHETYPES[DNA_ARCHETYPES.length - 1];
  for (const a of DNA_ARCHETYPES) {
    try {
      if (a.condition(dna)) return a;
    } catch (e) {
      continue;
    }
  }
  return DNA_ARCHETYPES[DNA_ARCHETYPES.length - 1]; // fallback: Explorer
}

/**
 * getDnaLabel(dimId: number, value: number) → string
 * Returns the contextual label for a slider position.
 */
export function getDnaLabel(dimId, value) {
  const dim = DNA_DIMENSIONS[dimId];
  if (!dim) return '';
  const idx = Math.min(4, Math.floor((value / 100) * 5));
  return dim.labels[idx];
}

/**
 * calcDnaScore(candidateDna, jobDna, tolerance = 20) → number (0–100)
 *
 * Scores how well a candidate's DNA matches a job's required DNA.
 * jobDna can have null values for dimensions the employer doesn't care about.
 * tolerance: how many points either side counts as a good match.
 *
 * Algorithm:
 *   - For each dimension with a jobDna value:
 *     - distance = |candidateDna[i] - jobDna[i]|
 *     - score[i] = max(0, 1 - (distance / tolerance))² — quadratic falloff
 *   - Final = weighted average, clamped 0–100
 */
export function calcDnaScore(candidateDna, jobDna, tolerance = 22) {
  if (!candidateDna || !jobDna) return 0;

  // Dimension weights — some dimensions matter more for fit
  const WEIGHTS = [1.2, 1.0, 0.9, 1.1, 1.0, 0.8, 0.9];

  let totalWeight = 0;
  let totalScore  = 0;

  for (let i = 0; i < 7; i++) {
    if (jobDna[i] == null) continue; // employer left this blank
    const dist    = Math.abs((candidateDna[i] || 50) - jobDna[i]);
    const raw     = Math.max(0, 1 - dist / tolerance);
    const score   = raw * raw; // quadratic — rewards close matches more
    const weight  = WEIGHTS[i] || 1.0;
    totalScore   += score * weight;
    totalWeight  += weight;
  }

  if (totalWeight === 0) return 100; // no DNA prefs = perfect match
  return Math.round((totalScore / totalWeight) * 100);
}

/**
 * calcOverallMatchScore(candidate, job) → { overall, dna, skills }
 *
 * candidate: { dna: number[7], skills: string[] }
 * job:       { dna: number[7]|null[], skillsRequired: string[], skillsNice: string[] }
 *
 * Returns object with three scores (0–100) + breakdown text.
 */
export function calcOverallMatchScore(candidate, job) {
  // DNA score
  const dnaScore = job.dna
    ? calcDnaScore(candidate.dna, job.dna)
    : 75;

  // Skills score (Jaccard-ish)
  const required  = job.skillsRequired || [];
  const nice      = job.skillsNice     || [];
  const candSkills = (candidate.skills || []).map(s => s.toLowerCase());

  let skillScore = 100;
  if (required.length > 0) {
    const hits = required.filter(s => candSkills.includes(s.toLowerCase())).length;
    const niceHits = nice.filter(s => candSkills.includes(s.toLowerCase())).length;
    const base  = (hits / required.length) * 80;
    const bonus = nice.length > 0 ? (niceHits / nice.length) * 20 : 20;
    skillScore  = Math.round(base + bonus);
  }

  // Overall — DNA weighted more (it's the differentiator)
  const overall = Math.round(dnaScore * 0.55 + skillScore * 0.45);

  return {
    overall: Math.min(99, overall),
    dna:     Math.min(99, dnaScore),
    skills:  Math.min(99, skillScore),
  };
}

/**
 * getTeamDnaProfile(members: { dna: number[7] }[]) → number[7]
 * Returns the mean DNA vector for a team.
 */
export function getTeamDnaProfile(members) {
  if (!members || members.length === 0) return Array(7).fill(50);
  const sums = Array(7).fill(0);
  for (const m of members) {
    for (let i = 0; i < 7; i++) {
      sums[i] += (m.dna?.[i] ?? 50);
    }
  }
  return sums.map(s => Math.round(s / members.length));
}

/**
 * getDnaGaps(teamDna, idealDna) → { dim, delta, direction }[]
 * Returns dimensions where the team is furthest from ideal (sorted by gap size).
 */
export function getDnaGaps(teamDna, idealDna) {
  return DNA_DIMENSIONS
    .map((dim, i) => ({
      dim:       dim.label,
      icon:      dim.icon,
      actual:    teamDna[i] ?? 50,
      ideal:     idealDna[i] ?? 50,
      delta:     Math.abs((teamDna[i] ?? 50) - (idealDna[i] ?? 50)),
      direction: (teamDna[i] ?? 50) < (idealDna[i] ?? 50) ? 'increase' : 'decrease',
    }))
    .sort((a, b) => b.delta - a.delta);
}

/**
 * defaultDna() → number[7]
 * Returns a neutral starting position for all dimensions.
 */
export function defaultDna() {
  return [62, 28, 45, 35, 55, 58, 48];
}

/**
 * dnaToProfile(dna) → { archetype, traits, label per dimension }
 * Convenience function — returns everything needed to render a DNA card.
 */
export function dnaToProfile(dna) {
  return {
    archetype:  getArchetype(dna),
    dimensions: DNA_DIMENSIONS.map((dim, i) => ({
      ...dim,
      value: dna[i] ?? 50,
      label: getDnaLabel(i, dna[i] ?? 50),
    })),
  };
}
