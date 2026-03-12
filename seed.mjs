/**
 * Hiro — Mock Data Seed Script
 * Creates 10 candidate + 10 employer accounts in Firebase Auth + Firestore
 *
 * Usage:
 *   node seed.mjs
 *
 * Requirements:
 *   npm install firebase   (already in your package.json)
 */

import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

// ── Firebase config (from firebase-applet-config.json) ──────────────
const firebaseConfig = {
  apiKey:            "AIzaSyAP59zxWcyqeaGiJCMAHN4EObP9d0_Q4wA",
  authDomain:        "gen-lang-client-0319743731.firebaseapp.com",
  projectId:         "gen-lang-client-0319743731",
  storageBucket:     "gen-lang-client-0319743731.firebasestorage.app",
  messagingSenderId: "582248086733",
  appId:             "1:582248086733:web:821e416544755d6e9cfd84",
  databaseId:        "ai-studio-f53003d0-fb71-456f-a7b3-56b0c9169584",
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app, "ai-studio-f53003d0-fb71-456f-a7b3-56b0c9169584");

// ── Shared password for all mock accounts ───────────────────────────
const MOCK_PASSWORD = "Hiro2026!";

// ── 10 Candidate accounts ───────────────────────────────────────────
const CANDIDATES = [
  {
    email: "jordan.mitchell@hiro-demo.com",
    full_name: "Jordan Mitchell",
    first_name: "Jordan", last_name: "Mitchell",
    job_title: "Senior Product Manager",
    experience_years: "6–10 years",
    location: "London, UK",
    skills: ["Product Management", "Fintech", "SQL", "Agile", "Stakeholder management"],
    dna: [65, 30, 45, 35, 60, 55, 70],
    archetype: "The Strategist",
    target_salary: 140,
    company_stage: "Series A–C",
    notice_period: "1 month",
    work_experience: [
      { role: "Senior PM", company: "Monzo", period: "2021–present" },
      { role: "PM", company: "Revolut", period: "2019–2021" },
    ],
  },
  {
    email: "priya.sharma@hiro-demo.com",
    full_name: "Priya Sharma",
    first_name: "Priya", last_name: "Sharma",
    job_title: "Lead Frontend Engineer",
    experience_years: "4–6 years",
    location: "Manchester, UK",
    skills: ["React", "TypeScript", "Python", "Design", "Agile"],
    dna: [30, 20, 60, 25, 75, 40, 55],
    archetype: "The Craftsperson",
    target_salary: 110,
    company_stage: "Series A–C",
    notice_period: "1 month",
    work_experience: [
      { role: "Lead Frontend Engineer", company: "Synthesia", period: "2022–present" },
      { role: "Senior Engineer", company: "Babylon Health", period: "2020–2022" },
    ],
  },
  {
    email: "marcus.okafor@hiro-demo.com",
    full_name: "Marcus Okafor",
    first_name: "Marcus", last_name: "Okafor",
    job_title: "Head of Growth",
    experience_years: "6–10 years",
    location: "London, UK",
    skills: ["Growth", "Go-to-market", "Marketing", "Data Analysis", "SQL"],
    dna: [80, 55, 35, 70, 50, 75, 85],
    archetype: "The Builder",
    target_salary: 155,
    company_stage: "Series D+",
    notice_period: "2 months",
    work_experience: [
      { role: "Head of Growth", company: "Wise", period: "2020–present" },
      { role: "Growth PM", company: "Deliveroo", period: "2017–2020" },
    ],
  },
  {
    email: "sofia.andersson@hiro-demo.com",
    full_name: "Sofia Andersson",
    first_name: "Sofia", last_name: "Andersson",
    job_title: "Data Scientist",
    experience_years: "2–4 years",
    location: "Remote (EU)",
    skills: ["Python", "SQL", "Data Analysis", "AI/ML", "Finance"],
    dna: [25, 15, 55, 20, 70, 35, 60],
    archetype: "The Craftsperson",
    target_salary: 90,
    company_stage: "Any stage",
    notice_period: "Immediately",
    work_experience: [
      { role: "Data Scientist", company: "Klarna", period: "2023–present" },
      { role: "Data Analyst", company: "Spotify", period: "2022–2023" },
    ],
  },
  {
    email: "tom.bradshaw@hiro-demo.com",
    full_name: "Tom Bradshaw",
    first_name: "Tom", last_name: "Bradshaw",
    job_title: "Engineering Manager",
    experience_years: "10+ years",
    location: "London, UK",
    skills: ["Engineering", "Agile", "Python", "Operations", "Stakeholder management"],
    dna: [50, 40, 40, 50, 40, 50, 65],
    archetype: "The Operator",
    target_salary: 175,
    company_stage: "Series D+",
    notice_period: "3 months",
    work_experience: [
      { role: "Engineering Manager", company: "Checkout.com", period: "2019–present" },
      { role: "Staff Engineer", company: "GoCardless", period: "2015–2019" },
    ],
  },
  {
    email: "aisha.khan@hiro-demo.com",
    full_name: "Aisha Khan",
    first_name: "Aisha", last_name: "Khan",
    job_title: "UX Designer",
    experience_years: "4–6 years",
    location: "London, UK",
    skills: ["Design", "Product Management", "Go-to-market", "Marketing"],
    dna: [55, 45, 75, 60, 55, 30, 45],
    archetype: "The Strategist",
    target_salary: 95,
    company_stage: "Seed",
    notice_period: "1 month",
    work_experience: [
      { role: "Senior UX Designer", company: "Figma", period: "2022–present" },
      { role: "Product Designer", company: "Typeform", period: "2020–2022" },
    ],
  },
  {
    email: "chris.newton@hiro-demo.com",
    full_name: "Chris Newton",
    first_name: "Chris", last_name: "Newton",
    job_title: "VP of Sales",
    experience_years: "10+ years",
    location: "New York, US",
    skills: ["Sales", "Go-to-market", "Operations", "Finance", "Stakeholder management"],
    dna: [85, 70, 30, 80, 35, 80, 90],
    archetype: "The Builder",
    target_salary: 200,
    company_stage: "Series A–C",
    notice_period: "2 months",
    work_experience: [
      { role: "VP Sales", company: "HubSpot", period: "2020–present" },
      { role: "Sales Director", company: "Salesforce", period: "2015–2020" },
    ],
  },
  {
    email: "elena.rossi@hiro-demo.com",
    full_name: "Elena Rossi",
    first_name: "Elena", last_name: "Rossi",
    job_title: "Finance Director",
    experience_years: "6–10 years",
    location: "Milan, Italy",
    skills: ["Finance", "Operations", "Data Analysis", "SQL", "Stakeholder management"],
    dna: [35, 15, 50, 30, 45, 25, 50],
    archetype: "The Operator",
    target_salary: 130,
    company_stage: "Public",
    notice_period: "3 months",
    work_experience: [
      { role: "Finance Director", company: "Enel", period: "2018–present" },
      { role: "Senior Finance Manager", company: "UniCredit", period: "2014–2018" },
    ],
  },
  {
    email: "dev.patel@hiro-demo.com",
    full_name: "Dev Patel",
    first_name: "Dev", last_name: "Patel",
    job_title: "AI/ML Engineer",
    experience_years: "2–4 years",
    location: "London, UK",
    skills: ["AI/ML", "Python", "React", "Data Analysis", "Engineering"],
    dna: [40, 20, 65, 30, 80, 65, 70],
    archetype: "The Craftsperson",
    target_salary: 120,
    company_stage: "Series A–C",
    notice_period: "Immediately",
    work_experience: [
      { role: "ML Engineer", company: "DeepMind", period: "2023–present" },
      { role: "Junior ML Engineer", company: "Faculty AI", period: "2022–2023" },
    ],
  },
  {
    email: "rachel.oconnor@hiro-demo.com",
    full_name: "Rachel O'Connor",
    first_name: "Rachel", last_name: "O'Connor",
    job_title: "People & Talent Director",
    experience_years: "6–10 years",
    location: "Dublin, Ireland",
    skills: ["People & HR", "Operations", "Stakeholder management", "Marketing", "Finance"],
    dna: [70, 50, 80, 65, 50, 40, 60],
    archetype: "The Strategist",
    target_salary: 125,
    company_stage: "Series A–C",
    notice_period: "2 months",
    work_experience: [
      { role: "People Director", company: "Intercom", period: "2019–present" },
      { role: "HR Business Partner", company: "Stripe", period: "2016–2019" },
    ],
  },
];

// ── 10 Employer accounts ─────────────────────────────────────────────
const EMPLOYERS = [
  {
    email: "hiring@monzo-demo.com",
    full_name: "Monzo Hiring",
    company_name: "Monzo",
    company_size: "501–1000",
    industry: "Fintech",
    stage: "Series D+",
    location: "London, UK",
    tagline: "Make money work for everyone.",
    culture_tags: ["⚡ Async-first", "📊 Data-driven decisions", "🏗 Flat hierarchy"],
    team_dna: [45, 25, 50, 30, 55, 60, 65],
    open_roles: [{ title: "Senior PM — Payments", function: "Product", seniority: "Senior IC" }],
  },
  {
    email: "talent@revolut-demo.com",
    full_name: "Revolut Talent",
    company_name: "Revolut",
    company_size: "1001–5000",
    industry: "Fintech",
    stage: "Series D+",
    location: "London, UK",
    tagline: "One app for all things money.",
    culture_tags: ["🚀 Fast-paced, high ambition", "🏆 High-ownership teams", "📊 Data-driven decisions"],
    team_dna: [70, 60, 35, 65, 40, 80, 75],
    open_roles: [{ title: "Lead Product Manager", function: "Product", seniority: "Lead / Staff" }],
  },
  {
    email: "jobs@synthesia-demo.com",
    full_name: "Synthesia Jobs",
    company_name: "Synthesia",
    company_size: "101–250",
    industry: "AI / ML",
    stage: "Series C",
    location: "London, UK",
    tagline: "The AI video platform.",
    culture_tags: ["💻 Engineering-led", "🎯 Mission-driven", "🌍 Remote-friendly"],
    team_dna: [40, 30, 55, 35, 65, 70, 60],
    open_roles: [{ title: "PM — AI Products", function: "Product", seniority: "Senior IC" }],
  },
  {
    email: "hiring@wise-demo.com",
    full_name: "Wise Hiring",
    company_name: "Wise",
    company_size: "1001–5000",
    industry: "Fintech",
    stage: "Public",
    location: "London, UK",
    tagline: "Money without borders.",
    culture_tags: ["📊 Data-driven decisions", "🏗 Flat hierarchy", "🌍 Remote-friendly"],
    team_dna: [50, 30, 50, 40, 55, 50, 55],
    open_roles: [{ title: "Senior PM — Growth", function: "Product", seniority: "Senior IC" }],
  },
  {
    email: "talent@vercel-demo.com",
    full_name: "Vercel Talent",
    company_name: "Vercel",
    company_size: "251–500",
    industry: "B2B SaaS",
    stage: "Series C",
    location: "Remote",
    tagline: "Build. Deploy. Scale.",
    culture_tags: ["⚡ Async-first", "💻 Engineering-led", "🌍 Remote-friendly"],
    team_dna: [30, 20, 60, 20, 80, 60, 65],
    open_roles: [{ title: "Staff Engineer — DX", function: "Engineering", seniority: "Lead / Staff" }],
  },
  {
    email: "people@linear-demo.com",
    full_name: "Linear People",
    company_name: "Linear",
    company_size: "51–100",
    industry: "B2B SaaS",
    stage: "Series B",
    location: "Remote",
    tagline: "The issue tracker that doesn't get in your way.",
    culture_tags: ["🏆 High-ownership teams", "⚡ Async-first", "🎨 Design-led"],
    team_dna: [25, 25, 55, 15, 85, 55, 70],
    open_roles: [{ title: "Product Engineer", function: "Engineering", seniority: "Senior IC" }],
  },
  {
    email: "hiring@checkout-demo.com",
    full_name: "Checkout.com Hiring",
    company_name: "Checkout.com",
    company_size: "1001–5000",
    industry: "Fintech / Payments",
    stage: "Series D+",
    location: "London, UK",
    tagline: "The intelligent choice for payments.",
    culture_tags: ["📊 Data-driven decisions", "🚀 Fast-paced, high ambition", "📋 Structured & process-led"],
    team_dna: [55, 35, 45, 50, 50, 65, 60],
    open_roles: [{ title: "Director of Engineering", function: "Engineering", seniority: "Director" }],
  },
  {
    email: "jobs@figma-demo.com",
    full_name: "Figma Jobs",
    company_name: "Figma",
    company_size: "501–1000",
    industry: "Design Tools / SaaS",
    stage: "Public",
    location: "San Francisco, US",
    tagline: "Design the future together.",
    culture_tags: ["🎨 Design-led", "🤝 Collaborative by default", "📚 Strong L&D culture"],
    team_dna: [60, 40, 70, 55, 55, 45, 60],
    open_roles: [{ title: "Senior Product Designer", function: "Design", seniority: "Senior IC" }],
  },
  {
    email: "talent@notion-demo.com",
    full_name: "Notion Talent",
    company_name: "Notion",
    company_size: "251–500",
    industry: "Productivity / SaaS",
    stage: "Series C",
    location: "Remote",
    tagline: "One workspace. Every team.",
    culture_tags: ["🎯 Mission-driven", "⚡ Async-first", "📚 Strong L&D culture"],
    team_dna: [35, 35, 60, 25, 70, 45, 65],
    open_roles: [{ title: "Head of Growth", function: "Marketing", seniority: "VP / Head of" }],
  },
  {
    email: "hiring@intercom-demo.com",
    full_name: "Intercom Hiring",
    company_name: "Intercom",
    company_size: "501–1000",
    industry: "Customer Success / SaaS",
    stage: "Series D+",
    location: "Dublin, Ireland",
    tagline: "The complete AI-first customer service solution.",
    culture_tags: ["🤝 Collaborative by default", "📊 Data-driven decisions", "📚 Strong L&D culture"],
    team_dna: [65, 45, 65, 60, 50, 50, 60],
    open_roles: [{ title: "People Partner — GTM", function: "People & HR", seniority: "Senior IC" }],
  },
];

// ── Seed function ────────────────────────────────────────────────────
async function seedUser(userData, mode) {
  const { email, full_name, ...profileFields } = userData;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, MOCK_PASSWORD);
    const uid  = cred.user.uid;

    await setDoc(doc(db, "users", uid), {
      id:        uid,
      email,
      mode,
      full_name,
      ...profileFields,
      createdAt: serverTimestamp(),
    });

    console.log(`  ✓  ${mode.padEnd(9)}  ${email}`);
    return { email, password: MOCK_PASSWORD, name: full_name, mode };
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      console.log(`  ⚠  ${mode.padEnd(9)}  ${email}  (already exists — skipped)`);
      return { email, password: MOCK_PASSWORD, name: full_name, mode, note: "already existed" };
    }
    console.error(`  ✗  ${email}  →  ${err.message}`);
    return null;
  }
}

async function main() {
  console.log("\n═══════════════════════════════════════════");
  console.log("  Hiro — Mock Data Seed");
  console.log("═══════════════════════════════════════════\n");

  const results = [];

  console.log("── Candidates ──────────────────────────────");
  for (const c of CANDIDATES) {
    const r = await seedUser(c, "candidate");
    if (r) results.push(r);
  }

  console.log("\n── Employers ───────────────────────────────");
  for (const e of EMPLOYERS) {
    const r = await seedUser(e, "employer");
    if (r) results.push(r);
  }

  // ── Print login table ──────────────────────────────────────────────
  console.log("\n\n═══════════════════════════════════════════");
  console.log("  LOGIN CREDENTIALS  (password: Hiro2026!)");
  console.log("═══════════════════════════════════════════\n");

  console.log("CANDIDATES");
  console.log("─────────────────────────────────────────────────────────────────────");
  console.log("  Name                     Email");
  console.log("─────────────────────────────────────────────────────────────────────");
  results.filter(r => r.mode === "candidate").forEach(r => {
    console.log(`  ${r.name.padEnd(25)}${r.email}`);
  });

  console.log("\nEMPLOYERS");
  console.log("─────────────────────────────────────────────────────────────────────");
  console.log("  Name                     Email");
  console.log("─────────────────────────────────────────────────────────────────────");
  results.filter(r => r.mode === "employer").forEach(r => {
    console.log(`  ${r.name.padEnd(25)}${r.email}`);
  });

  console.log("\n  Password for all accounts:  Hiro2026!\n");
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });

