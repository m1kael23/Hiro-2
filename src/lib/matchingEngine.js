/**
 * ═══════════════════════════════════════════════════════════════
 *  HIRO — Live Matching Engine  v1.0
 *
 *  Triggers:
 *    fanOutJobMatches(job)        — called when a job is published
 *    fanOutCandidateMatches(cand) — called when a candidate saves DNA
 *
 *  What it does:
 *    For each (candidate, job) pair, computes a match score and
 *    writes/updates an `applications` document in Firestore.
 *
 *  applications/{id} document shape:
 *    candidateId        — candidate user uid
 *    jobId              — job document id
 *    employerId         — employer user uid
 *    matchScore         — overall 0–100
 *    dnaScore           — DNA dimension score 0–100
 *    skillsScore        — skills overlap score 0–100
 *    salaryFit          — 'great' | 'ok' | 'stretch'
 *    stage              — pipeline stage (starts 'matched')
 *    status             — 'matched' | 'applied' | 'hired' | 'rejected'
 *    candidateExpressedInterest — boolean
 *    employerExpressedInterest  — boolean
 *    createdAt / updatedAt
 *
 *  Mutual match = candidateExpressedInterest AND employerExpressedInterest
 *  The flag is never overwritten by re-scoring — only interest actions touch it.
 * ═══════════════════════════════════════════════════════════════
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { scoreJobForCandidate } from './matchStore';

// Minimum score threshold — below this we don't create a match document.
// Keeps the pipeline clean and prevents very low-fit noise.
const MIN_MATCH_SCORE = 40;

// ─────────────────────────────────────────────────────────────────
//  INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * Build a stable, deterministic document ID for a (candidate, job) pair.
 * This means repeated runs upsert the same doc — no duplicates.
 */
function matchDocId(candidateId, jobId) {
  return `${candidateId}_${jobId}`;
}

/**
 * Map a Firestore user document (candidate profile) to the shape
 * the scoring engine expects.
 */
function profileToCandidate(profile) {
  return {
    id: profile.id || profile.uid,
    dna: profile.dna || [50, 50, 50, 50, 50, 50, 50],
    skills: profile.skills || [],
    salaryMin: profile.salary_min || profile.salaryMin || 60,
    salaryMax: profile.salary_max || profile.salaryMax || 200,
  };
}

/**
 * Map a Firestore job document to the shape the scoring engine expects.
 */
function firestoreJobToJob(jobDoc) {
  return {
    id: jobDoc.id,
    dnaPrefs: jobDoc.dnaPrefs || null,
    skillsRequired: jobDoc.skillsRequired || jobDoc.mustSkills || [],
    skillsNice: jobDoc.skillsNice || [],
    salaryMin: jobDoc.salMin || 0,
    salaryMax: jobDoc.salMax || 0,
  };
}

/**
 * Write (or upsert) a single match document.
 * Preserves existing interest flags — never overwrites them.
 */
async function upsertMatch({ candidateId, jobId, employerId, scores, existingDoc }) {
  const docId  = matchDocId(candidateId, jobId);
  const docRef = doc(db, 'applications', docId);

  // Preserve interest state if doc already exists
  const candidateExpressedInterest = existingDoc?.candidateExpressedInterest || false;
  const employerExpressedInterest  = existingDoc?.employerExpressedInterest  || false;
  const stage = existingDoc?.stage || 'matched';
  const status = existingDoc?.status || 'matched';

  const payload = {
    id: docId,
    candidateId,
    jobId,
    employerId,
    matchScore:  scores.overall,
    dnaScore:    scores.dna,
    skillsScore: scores.skills,
    salaryFit:   scores.salaryFit,
    stage,
    status,
    candidateExpressedInterest,
    employerExpressedInterest,
    updatedAt: serverTimestamp(),
    // Only set createdAt on first write
    ...(!existingDoc && { createdAt: serverTimestamp() }),
  };

  await setDoc(docRef, payload, { merge: true });
  return payload;
}

// ─────────────────────────────────────────────────────────────────
//  PUBLIC API
// ─────────────────────────────────────────────────────────────────

/**
 * fanOutJobMatches(jobData)
 *
 * Called immediately after a job is published.
 * Fetches all candidate profiles, scores each one against the new job,
 * and writes match documents for scores above the threshold.
 *
 * @param {object} jobData — the job object just written to Firestore
 * @returns {Promise<{ created: number, skipped: number }>}
 */
export async function fanOutJobMatches(jobData) {
  let created = 0;
  let skipped = 0;
  let dnaTotals = 0;

  try {
    // Fetch all candidate users
    const q = query(collection(db, 'users'), where('mode', '==', 'candidate'));
    const snap = await getDocs(q);

    if (snap.empty) {
      console.info('[MatchEngine] No candidates found — nothing to score.');
      return { created, skipped };
    }

    const job = firestoreJobToJob(jobData);

    // Fetch any existing match docs for this job to preserve interest state
    const existingQ = query(collection(db, 'applications'), where('jobId', '==', job.id));
    const existingSnap = await getDocs(existingQ);
    const existingByCandidate = {};
    existingSnap.docs.forEach(d => {
      existingByCandidate[d.data().candidateId] = d.data();
    });

    const writes = [];

    snap.docs.forEach(userDoc => {
      const profile = { id: userDoc.id, ...userDoc.data() };
      const candidate = profileToCandidate(profile);

      // Skip candidates with no DNA set yet
      if (!profile.dna || !Array.isArray(profile.dna)) {
        skipped++;
        return;
      }

      const scores = scoreJobForCandidate(candidate, job);

      if (scores.overall < MIN_MATCH_SCORE) {
        skipped++;
        return;
      }

      writes.push(
        upsertMatch({
          candidateId: profile.id,
          jobId:       job.id,
          employerId:  jobData.employerId,
          scores,
          existingDoc: existingByCandidate[profile.id] || null,
        }).then(() => { created++; dnaTotals += scores.dna; })
          .catch(err => {
            console.error(`[MatchEngine] Failed to write match ${profile.id}_${job.id}:`, err);
          })
      );
    });

    await Promise.all(writes);

    const avgDna = created > 0
      ? Math.round(dnaTotals / created)
      : null;

    console.info(`[MatchEngine] fanOutJobMatches complete: ${created} created, ${skipped} skipped`);
    return { created, skipped, avgDna };

  } catch (err) {
    console.error('[MatchEngine] fanOutJobMatches error:', err);
    return { created, skipped };
  }
}

/**
 * fanOutCandidateMatches(candidateProfile)
 *
 * Called when a candidate saves or updates their DNA profile.
 * Fetches all live jobs, scores the candidate against each,
 * and upserts match documents.
 *
 * @param {object} candidateProfile — the full user profile object
 * @returns {Promise<{ created: number, skipped: number }>}
 */
export async function fanOutCandidateMatches(candidateProfile) {
  let created = 0;
  let skipped = 0;

  try {
    if (!candidateProfile?.dna || !Array.isArray(candidateProfile.dna)) {
      console.warn('[MatchEngine] fanOutCandidateMatches: candidate has no DNA, skipping.');
      return { created, skipped };
    }

    // Fetch all live jobs
    const q = query(collection(db, 'jobs'), where('status', '==', 'live'));
    const snap = await getDocs(q);

    if (snap.empty) {
      console.info('[MatchEngine] No live jobs found — nothing to score.');
      return { created, skipped };
    }

    const candidate = profileToCandidate(candidateProfile);
    const candidateId = candidateProfile.id || candidateProfile.uid;

    // Fetch any existing match docs for this candidate to preserve interest state
    const existingQ = query(collection(db, 'applications'), where('candidateId', '==', candidateId));
    const existingSnap = await getDocs(existingQ);
    const existingByJob = {};
    existingSnap.docs.forEach(d => {
      existingByJob[d.data().jobId] = d.data();
    });

    const writes = [];

    snap.docs.forEach(jobDoc => {
      const jobData = { id: jobDoc.id, ...jobDoc.data() };
      const job = firestoreJobToJob(jobData);

      const scores = scoreJobForCandidate(candidate, job);

      if (scores.overall < MIN_MATCH_SCORE) {
        skipped++;
        return;
      }

      writes.push(
        upsertMatch({
          candidateId,
          jobId:      job.id,
          employerId: jobData.employerId,
          scores,
          existingDoc: existingByJob[job.id] || null,
        }).then(() => { created++; })
          .catch(err => {
            console.error(`[MatchEngine] Failed to write match ${candidateId}_${job.id}:`, err);
          })
      );
    });

    await Promise.all(writes);

    console.info(`[MatchEngine] fanOutCandidateMatches complete: ${created} created, ${skipped} skipped`);
    return { created, skipped };

  } catch (err) {
    console.error('[MatchEngine] fanOutCandidateMatches error:', err);
    return { created, skipped };
  }
}

/**
 * recomputeAllMatches()
 *
 * Admin/ops utility — recomputes every (candidate × live job) pair.
 * Use sparingly: O(candidates × jobs) Firestore writes.
 * Safe to call at any time — upsert preserves all interest state.
 *
 * @returns {Promise<{ total: number, skipped: number }>}
 */
export async function recomputeAllMatches() {
  let total = 0;
  let skipped = 0;

  try {
    const [jobsSnap, candidatesSnap] = await Promise.all([
      getDocs(query(collection(db, 'jobs'), where('status', '==', 'live'))),
      getDocs(query(collection(db, 'users'), where('mode', '==', 'candidate'))),
    ]);

    // Load all existing match docs to preserve interest state
    const existingSnap = await getDocs(collection(db, 'applications'));
    const existingMap = {};
    existingSnap.docs.forEach(d => { existingMap[d.id] = d.data(); });

    const writes = [];

    jobsSnap.docs.forEach(jobDoc => {
      const jobData = { id: jobDoc.id, ...jobDoc.data() };
      const job = firestoreJobToJob(jobData);

      candidatesSnap.docs.forEach(userDoc => {
        const profile = { id: userDoc.id, ...userDoc.data() };
        if (!profile.dna || !Array.isArray(profile.dna)) { skipped++; return; }

        const candidate = profileToCandidate(profile);
        const scores = scoreJobForCandidate(candidate, job);

        if (scores.overall < MIN_MATCH_SCORE) { skipped++; return; }

        const docId = matchDocId(profile.id, job.id);
        writes.push(
          upsertMatch({
            candidateId: profile.id,
            jobId:       job.id,
            employerId:  jobData.employerId,
            scores,
            existingDoc: existingMap[docId] || null,
          }).then(() => { total++; })
            .catch(err => console.error(`[MatchEngine] recompute error ${docId}:`, err))
        );
      });
    });

    await Promise.all(writes);
    console.info(`[MatchEngine] recomputeAllMatches: ${total} written, ${skipped} skipped`);
    return { total, skipped };

  } catch (err) {
    console.error('[MatchEngine] recomputeAllMatches error:', err);
    return { total, skipped };
  }
}
