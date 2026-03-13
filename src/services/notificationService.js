/**
 * notificationService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Central write layer for all Hiro notifications.
 *
 * Every function writes a document to /notifications/{id} in Firestore.
 * NotificationContext.jsx already has the real-time listener — once a doc
 * lands here, it surfaces in the bell immediately.
 *
 * Notification types (used for icon + routing in NotificationsView):
 *   match          → cand-matches / emp-candidates
 *   interest       → emp-candidates
 *   application    → emp-pipeline
 *   ghost_flag     → cand-ghosting / emp-ghosting
 *   bench_view     → cand-bench
 *   bench_interest → cand-bench
 *   pulse_drift    → cand-pulse
 *   pulse_due      → cand-pulse
 *   offer_deadline → cand-offer-intel / emp-offer-intel
 *   decay_alert    → emp-pipeline  (employer: candidate going cold)
 *   message        → cand-messages / emp-messages
 *   review         → cand-reviews / emp-reviews
 *   system         → (no route)
 */

import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';

// ─── Core write ───────────────────────────────────────────────────────────────

/**
 * Low-level: write one notification document.
 * @param {string}  userId
 * @param {string}  type    — see type list above
 * @param {string}  title
 * @param {string}  message
 * @param {string}  [route] — view key to navigate to on click
 * @param {object}  [meta]  — arbitrary extra payload (candidateId, jobId, etc.)
 */
async function push(userId, type, title, message, route = '', meta = {}) {
  if (!userId) return;
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      type,
      title,
      message,
      route,
      read: false,
      createdAt: serverTimestamp(),
      ...meta,
    });
  } catch (err) {
    console.error('[notificationService] push failed:', err);
  }
}

// ─── Dedup guard ─────────────────────────────────────────────────────────────
// Prevent duplicate notifications of the same type within a cooldown window.

async function alreadySentRecently(userId, type, windowMs = 24 * 60 * 60 * 1000) {
  try {
    const cutoff = new Date(Date.now() - windowMs);
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('type', '==', type),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return false;
    const lastDoc = snap.docs[0].data();
    const lastTs = lastDoc.createdAt?.toDate?.() ?? null;
    return lastTs && lastTs > cutoff;
  } catch {
    return false; // fail open — send the notification
  }
}

// ─── 1. Mutual Match ─────────────────────────────────────────────────────────

/**
 * Fire when both candidateExpressedInterest AND employerExpressedInterest
 * become true on an Application doc.
 */
export async function notifyMutualMatch({ candidateId, employerId, jobTitle, companyName }) {
  await Promise.all([
    push(
      candidateId,
      'match',
      `🤝 It's a match — ${companyName}`,
      `You and ${companyName} both expressed interest in the ${jobTitle} role. Start the conversation.`,
      'cand-matches',
      { relatedEmployerId: employerId }
    ),
    push(
      employerId,
      'match',
      `🤝 Mutual match confirmed`,
      `A candidate matched on your ${jobTitle} role. Both sides expressed interest — review them now.`,
      'emp-candidates'
    ),
  ]);
}

// ─── 2. Employer expressed interest in a candidate ───────────────────────────

export async function notifyEmployerInterest({ candidateId, companyName, jobTitle }) {
  const alreadySent = await alreadySentRecently(
    candidateId, 'interest', 6 * 60 * 60 * 1000
  );
  if (alreadySent) return;
  await push(
    candidateId,
    'interest',
    `✨ ${companyName} is interested in you`,
    `They expressed interest in your profile for the ${jobTitle} role. Express interest back to unlock the conversation.`,
    'cand-matches'
  );
}

// ─── 3. New application received (employer) ──────────────────────────────────

export async function notifyNewApplication({ employerId, jobTitle, candidateInitials }) {
  await push(
    employerId,
    'application',
    `📥 New application — ${jobTitle}`,
    `${candidateInitials}. applied to ${jobTitle}. Review their DNA match and profile.`,
    'emp-pipeline'
  );
}

// ─── 4. Ghost Flag ────────────────────────────────────────────────────────────

/**
 * Candidate ghosted: fire for the employer so they know their score dropped.
 * @param {string} targetUserId  — the user whose score is impacted
 * @param {string} mode          — 'candidate' | 'employer'
 * @param {string} context       — short description e.g. "after 3 rounds at Monzo"
 */
export async function notifyGhostFlag({ targetUserId, mode, context }) {
  const alreadySent = await alreadySentRecently(targetUserId, 'ghost_flag', 48 * 60 * 60 * 1000);
  if (alreadySent) return;

  const isCandidate = mode === 'candidate';
  await push(
    targetUserId,
    'ghost_flag',
    isCandidate
      ? `⚠️ Reliability score impacted`
      : `⚠️ Ghosting score impacted`,
    isCandidate
      ? `A no-response event (${context}) has been logged against your Reliability Score. Consistent follow-through keeps your score high.`
      : `A ghosting event (${context}) has been logged. Employers with lower scores get reduced Bench visibility.`,
    isCandidate ? 'cand-ghosting' : 'emp-ghosting'
  );
}

// ─── 5. Bench view (candidate was viewed on The Bench) ───────────────────────

/**
 * Fire when an employer views a candidate's Bench card.
 * Deduped to once per 6 hours to avoid spam on popular profiles.
 */
export async function notifyBenchView({ candidateId, companyName }) {
  const alreadySent = await alreadySentRecently(candidateId, 'bench_view', 6 * 60 * 60 * 1000);
  if (alreadySent) return;
  await push(
    candidateId,
    'bench_view',
    `👀 ${companyName} viewed your Bench profile`,
    `Your Bench card got a view from ${companyName}. Keeping your Work DNA complete maximises your visibility.`,
    'cand-bench'
  );
}

// ─── 6. Bench interest (employer wants to connect via Bench) ─────────────────

export async function notifyBenchInterest({ candidateId, companyName, jobTitle }) {
  await push(
    candidateId,
    'bench_interest',
    `🏷️ ${companyName} wants to connect`,
    `${companyName} expressed interest in you via The Bench for ${jobTitle}. You can respond without revealing your identity.`,
    'cand-bench',
    { companyName }
  );
}

// ─── 7. Pulse Drift ──────────────────────────────────────────────────────────

/**
 * Fire when the delta between two pulse scores crosses the -0.15 threshold.
 * Defined in legal doc: if drift < -0.15 → trigger employer alert + candidate nudge.
 *
 * @param {string} candidateId
 * @param {number} previousScore  0–100
 * @param {number} currentScore   0–100
 * @param {string} driftDimension — which dimension dropped most e.g. 'Trajectory alignment'
 */
export async function notifyPulseDrift({ candidateId, previousScore, currentScore, driftDimension }) {
  const drift = (currentScore - previousScore) / 100; // normalise to 0–1 delta
  if (drift >= -0.15) return; // no notification if drift is mild

  const isSevere = drift <= -0.25;
  await push(
    candidateId,
    'pulse_drift',
    isSevere
      ? `🚨 Career Pulse: significant drop detected`
      : `⚠️ Career Pulse: drift noticed`,
    isSevere
      ? `Your pulse score dropped from ${previousScore} to ${currentScore}. ${driftDimension} is the main signal. Consider joining The Bench or reviewing your trajectory.`
      : `Your pulse score has dipped (${previousScore} → ${currentScore}). ${driftDimension} dropped. Worth checking in.`,
    'cand-pulse',
    { previousScore, currentScore, driftDimension }
  );
}

// ─── 8. Pulse Due ─────────────────────────────────────────────────────────────

/**
 * Fire when 85 days have passed since last pulse submission.
 * Called by a periodic check (see usePulseDueCheck hook below).
 */
export async function notifyPulseDue({ candidateId, daysSinceLast }) {
  const alreadySent = await alreadySentRecently(candidateId, 'pulse_due', 7 * 24 * 60 * 60 * 1000);
  if (alreadySent) return;
  await push(
    candidateId,
    'pulse_due',
    `💓 Your 90-day pulse is due`,
    `It's been ${daysSinceLast} days since your last Career Pulse. 90 seconds to check in — your trajectory tracking depends on it.`,
    'cand-pulse'
  );
}

// ─── 9. Offer Deadline ───────────────────────────────────────────────────────

/**
 * Fire when an offer deadline is approaching (≤48h or ≤24h).
 * @param {string}  userId
 * @param {string}  mode          — 'candidate' | 'employer'
 * @param {string}  companyName
 * @param {string}  jobTitle
 * @param {number}  hoursLeft
 */
export async function notifyOfferDeadline({ userId, mode, companyName, jobTitle, hoursLeft }) {
  const isUrgent = hoursLeft <= 24;
  const isCandidate = mode === 'candidate';
  await push(
    userId,
    'offer_deadline',
    isUrgent
      ? `🔴 Offer expires in ${hoursLeft}h — ${isCandidate ? companyName : jobTitle}`
      : `🟡 Offer deadline in ${hoursLeft}h`,
    isCandidate
      ? `Your offer from ${companyName} for ${jobTitle} expires in ${hoursLeft} hours. Check Offer Intelligence for negotiation context.`
      : `The candidate offer for ${jobTitle} expires in ${hoursLeft} hours. Follow up to avoid losing a high-match candidate.`,
    isCandidate ? 'cand-offer-intel' : 'emp-offer-intel',
    { hoursLeft }
  );
}

// ─── 10. Candidate Quality Decay (employer alert) ────────────────────────────

/**
 * Fire when a high-match candidate in the employer's pipeline hits a decay threshold.
 * Decay rates from legal doc: Senior Eng λ=0.09 → 50% decay at day 8.
 *
 * @param {string}  employerId
 * @param {string}  candidateInitials
 * @param {number}  dnaMatchScore     0–100
 * @param {number}  daysInactive
 * @param {string}  jobTitle
 */
export async function notifyDecayAlert({ employerId, candidateInitials, dnaMatchScore, daysInactive, jobTitle }) {
  if (dnaMatchScore < 70) return; // only alert on high-match candidates worth the urgency
  await push(
    employerId,
    'decay_alert',
    `⏳ ${candidateInitials}. may be going cold — ${jobTitle}`,
    `This ${dnaMatchScore}% DNA match has been in your pipeline without contact for ${daysInactive} days. Top candidates in this role accept elsewhere in ~8–12 days.`,
    'emp-pipeline',
    { dnaMatchScore, daysInactive }
  );
}

// ─── 11. New message ─────────────────────────────────────────────────────────

export async function notifyNewMessage({ recipientId, senderName, preview, mode }) {
  await push(
    recipientId,
    'message',
    `💬 New message from ${senderName}`,
    preview.length > 80 ? preview.slice(0, 77) + '…' : preview,
    mode === 'candidate' ? 'cand-messages' : 'emp-messages'
  );
}

// ─── 12. New review ──────────────────────────────────────────────────────────

export async function notifyNewReview({ recipientId, reviewerLabel, mode }) {
  await push(
    recipientId,
    'review',
    `⭐ You received a new review`,
    `${reviewerLabel} left a review on your profile. Reviews are anonymised until both sides have submitted.`,
    mode === 'candidate' ? 'cand-reviews' : 'emp-reviews'
  );
}

// ─── 13. System / Admin ──────────────────────────────────────────────────────

export async function notifySystem({ userId, title, message }) {
  await push(userId, 'system', title, message, '');
}

// ─── Utility hook: pulse due check ───────────────────────────────────────────
// Import and call this in CandPulse or a top-level effect to check if a pulse
// reminder should fire.

/**
 * checkAndNotifyPulseDue
 * Call once on candidate app load. Reads lastPulseAt from profile.
 *
 * @param {object} profile  — Firebase user profile
 * @param {function} updateProfile — from useAuth
 */
export async function checkAndNotifyPulseDue(profile, updateProfile) {
  if (!profile?.id || profile?.mode !== 'candidate') return;

  const lastPulseAt = profile.lastPulseAt?.toDate?.() ?? null;
  if (!lastPulseAt) {
    // Never taken a pulse — remind after 7 days on platform
    const createdAt = profile.createdAt?.toDate?.() ?? null;
    if (!createdAt) return;
    const daysSinceJoin = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceJoin >= 7) {
      await notifyPulseDue({ candidateId: profile.id, daysSinceLast: Math.floor(daysSinceJoin) });
    }
    return;
  }

  const daysSinceLast = (Date.now() - lastPulseAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLast >= 85) {
    await notifyPulseDue({ candidateId: profile.id, daysSinceLast: Math.floor(daysSinceLast) });
  }
}

// ─── 14. Blind match signal received (candidate notified) ─────────────────────
// Fired by BlindMatchContext when employer signals interest.

export async function notifySignalReceived({ recipientId, companyName, jobTitle, matchId }) {
  await push(
    recipientId,
    'bench_interest',
    `⚡ ${companyName || 'A company'} is interested`,
    `They matched your DNA for ${jobTitle || 'a role'} — accept to reveal both profiles and open a conversation.`,
    'cand-blind-matches',
    { companyName, jobTitle, matchId }
  );
}

// ─── 15. Interview scheduled (candidate notified) ─────────────────────────────
// Fired by InterviewScheduler after writing the interviews doc.

export async function notifyInterviewScheduled({ recipientId, jobTitle, date, time, interviewId }) {
  let friendlyDate = date;
  try {
    const [y, m, d] = date.split('-').map(Number);
    friendlyDate = new Date(y, m - 1, d).toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
  } catch { /* use raw date */ }

  await push(
    recipientId,
    'application',
    `📅 Interview confirmed — ${jobTitle || 'your role'}`,
    `Scheduled for ${friendlyDate} at ${time}. Check your Applications for full details.`,
    'cand-apps',
    { jobTitle, date, time, interviewId }
  );
}

// ─── 16. New DNA match (both sides) ───────────────────────────────────────────
// Higher-level wrapper — prefer notifyMutualMatch for confirmed mutual matches.

export async function notifyNewMatch({ recipientId, matchedWith, dnaScore, mode }) {
  await push(
    recipientId,
    'match',
    `🧬 New DNA match — ${Math.round(dnaScore ?? 0)}% fit`,
    `You've been matched with ${matchedWith || 'a new connection'} based on Work DNA alignment.`,
    mode === 'employer' ? 'emp-blind-matches' : 'cand-blind-matches',
    { matchedWith, dnaScore }
  );
}

// ─── 17. Ghost / Reliability score alert (alias for notifyGhostFlag) ──────────
// Used by CandGhosting when score drops below a threshold.

export async function notifyGhostScoreAlert({ recipientId, score, mode }) {
  await notifyGhostFlag({
    targetUserId: recipientId,
    mode: mode === 'employer' ? 'employer' : 'candidate',
    context: `score now ${Math.round(score)}`,
  });
}

// ─── 18. Offer received (candidate notified) ──────────────────────────────────

export async function notifyOfferReceived({ recipientId, companyName, jobTitle, offerId }) {
  await push(
    recipientId,
    'offer_deadline',
    `🎉 Offer received — ${companyName || 'an employer'}`,
    `You have an offer for ${jobTitle || 'a role'}. Respond within 7 days to protect your Reliability Score.`,
    'cand-apps',
    { companyName, jobTitle, offerId }
  );
}
