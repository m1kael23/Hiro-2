/**
 * ghostEvents.js — Client-side ghost event logger
 *
 * Writes to `users/{candidateId}/ghost_events` — the same subcollection
 * that `computeGhostScores` Cloud Function reads nightly.
 *
 * Event types mirror the Cloud Function's schema exactly:
 *   first_contact     employer expressed interest OR moved matched → screen
 *   stage_advanced    any forward pipeline move (screen → r1, r1 → r2, r2 → offer)
 *   offer_sent        moved to offer stage
 *   hired             moved to hired
 *   no_fit            employer explicitly passed / rejected candidate
 *   feedback_sent     interviewer submitted a scored playbook
 *
 * Ghost score formula (in Cloud Function):
 *   100 × (weighted_responses / total_required)
 *   with recency decay exp(−0.01 × days_since_event)
 *
 * Required fields on every event:
 *   type        string  — one of the types above
 *   employerId  string  — uid of the employer who acted
 *   jobId       string  — the job the action relates to
 *   createdAt   Timestamp
 *
 * Optional fields (passed when available):
 *   stage       string  — pipeline stage at time of action
 *   prevStage   string  — stage before move
 *   score       number  — playbook avg score (feedback_sent only)
 *   recommendation string — playbook recommendation (feedback_sent only)
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * @param {string} candidateId   — UID of the candidate (subcollection owner)
 * @param {string} employerId    — UID of the employer taking the action
 * @param {string} jobId         — Firestore job document ID
 * @param {string} type          — event type (see above)
 * @param {object} [meta={}]     — any extra fields (stage, prevStage, score, etc.)
 */
export async function logGhostEvent(candidateId, employerId, jobId, type, meta = {}) {
  if (!candidateId || !employerId || !jobId || !type) {
    console.warn('[ghostEvents] Missing required field — event not logged', { candidateId, employerId, jobId, type });
    return;
  }
  try {
    await addDoc(
      collection(db, 'users', candidateId, 'ghost_events'),
      {
        type,
        employerId,
        jobId,
        createdAt: serverTimestamp(),
        ...meta,
      }
    );
  } catch (err) {
    // Ghost logging is non-critical — never throw, just warn
    console.warn('[ghostEvents] Write failed (non-critical):', err?.message || err);
  }
}

/**
 * Determine the correct ghost event type for a pipeline stage move.
 * Returns null if the move doesn't warrant a ghost event (e.g. unknown stages).
 *
 * @param {string} from  — source stage key
 * @param {string} to    — destination stage key
 * @returns {string|null}
 */
export function ghostTypeForMove(from, to) {
  const toL  = (to  || '').toLowerCase();
  const fromL = (from || '').toLowerCase();

  if (toL === 'hired')  return 'hired';
  if (toL === 'offer')  return 'offer_sent';
  if (toL === 'no_fit' || toL === 'rejected' || toL === 'archived') return 'no_fit';

  // matched → screen = first contact
  if (fromL === 'matched' && toL === 'screen') return 'first_contact';

  // any other forward move
  const ORDER = ['matched', 'screen', 'r1', 'r2', 'offer', 'hired'];
  const fromIdx = ORDER.indexOf(fromL);
  const toIdx   = ORDER.indexOf(toL);
  if (fromIdx !== -1 && toIdx !== -1 && toIdx > fromIdx) return 'stage_advanced';

  return null;
}
