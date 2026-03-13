/**
 * ═══════════════════════════════════════════════════════════════
 *  HIRO — Notification + Email Utility  v1.0
 *
 *  Writes to:
 *    - `notifications`  Firestore collection  → rendered by NotificationContext
 *    - `mail`           Firestore collection  → processed by Firebase "Trigger Email" extension
 *
 *  Email delivery setup (one-time, no code changes needed):
 *    1. Install the extension:
 *       firebase ext:install firebase/firestore-send-email --project <your-project-id>
 *    2. When prompted, set:
 *         SMTP URI:        smtps://resend:<RESEND_API_KEY>@smtp.resend.com:465
 *         Mail collection: mail
 *         Default FROM:    Hiro <noreply@hiro.talent>
 *    3. Done — every doc added to `mail` will be sent automatically.
 *    Docs: https://extensions.dev/extensions/firebase/firestore-send-email
 * ═══════════════════════════════════════════════════════════════
 */

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const APP_URL = 'https://app.hiro.talent';

// ─────────────────────────────────────────────────────────────────
//  EMAIL HTML WRAPPER
// ─────────────────────────────────────────────────────────────────

function emailHtml({ title, body, ctaText, ctaUrl }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#09090b;font-family:'Inter',system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#0f0f1a;border:1px solid rgba(255,255,255,.1);border-radius:16px;overflow:hidden;max-width:560px;">
  <!-- Header -->
  <tr><td style="padding:28px 32px 0;">
    <div style="font-size:18px;font-weight:800;background:linear-gradient(135deg,#6c47ff,#38bdf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-0.03em;">Hiro</div>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:24px 32px;">
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;">${title}</h1>
    <div style="font-size:15px;color:rgba(255,255,255,.65);line-height:1.7;">${body}</div>
    ${ctaText ? `
    <div style="margin-top:24px;">
      <a href="${ctaUrl || APP_URL}" style="display:inline-block;padding:12px 24px;background:#6c47ff;color:#fff;font-size:14px;font-weight:700;border-radius:999px;text-decoration:none;">${ctaText} &rarr;</a>
    </div>` : ''}
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,.07);">
    <p style="margin:0;font-size:12px;color:rgba(255,255,255,.25);">
      You're receiving this because you have an active Hiro account.
      <a href="${APP_URL}/settings" style="color:rgba(255,255,255,.35);">Manage notifications</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────
//  CORE WRITER
// ─────────────────────────────────────────────────────────────────

/**
 * Write an in-app notification and optionally queue an email.
 *
 * @param {string} userId  - recipient Firebase UID
 * @param {object} opts
 *   title    {string}       - notification title (shown in bell dropdown)
 *   message  {string}       - notification body
 *   type     {string}       - 'match' | 'interest' | 'stage' | 'message' | 'offer' | 'info'
 *   route    {string|null}  - in-app route to navigate to on click
 *   email    {object|null}  - { to, subject, html, text } — omit to skip email
 */
export async function sendNotification(userId, { title, message, type = 'info', route = null, email = null }) {
  const writes = [
    addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      type,
      route,
      read:      false,
      createdAt: serverTimestamp(),
    }),
  ];

  if (email?.to && email?.subject) {
    writes.push(
      addDoc(collection(db, 'mail'), {
        to:      email.to,
        message: {
          subject: email.subject,
          html:    email.html  || `<p>${message}</p>`,
          text:    email.text  || message,
        },
        createdAt: serverTimestamp(),
      }),
    );
  }

  await Promise.all(writes);
}

// ─────────────────────────────────────────────────────────────────
//  DOMAIN EVENTS
// ─────────────────────────────────────────────────────────────────

/**
 * Called after a candidate expresses interest in a job.
 * If it's now a mutual match, notifies both parties.
 * Otherwise, notifies only the employer.
 *
 * @param {object} app            - application doc (post-write, reflects new interest state)
 * @param {string} candidateName
 * @param {string} jobTitle
 * @param {string} companyName
 * @param {string|null} candidateEmail - for email delivery
 * @param {string|null} employerEmail  - for email delivery
 */
export async function notifyInterestExpressed({
  app,
  candidateName,
  jobTitle,
  companyName,
  candidateEmail = null,
  employerEmail  = null,
}) {
  const isMutual = app.candidateExpressedInterest && app.employerExpressedInterest;

  if (isMutual) {
    await Promise.all([
      sendNotification(app.candidateId, {
        title:   '🧬 Mutual match!',
        message: `${companyName} is also interested in you for ${jobTitle}. Start a conversation →`,
        type:    'match',
        route:   'cand-matches',
        email:   candidateEmail ? {
          to:      candidateEmail,
          subject: `🧬 Mutual match: ${companyName} · ${jobTitle}`,
          html:    emailHtml({
            title:  `You matched with ${companyName}!`,
            body:   `${companyName} expressed interest in you for <strong style="color:#fff">${jobTitle}</strong>. Since you're both interested, you're a mutual match 🎉<br><br>Mutual matches respond <strong>2.4× faster</strong> on Hiro — start a conversation now.`,
            ctaText: 'View match',
            ctaUrl:  `${APP_URL}/matches`,
          }),
          text: `You have a mutual match with ${companyName} for ${jobTitle}. Log in to start a conversation: ${APP_URL}`,
        } : null,
      }),
      sendNotification(app.employerId, {
        title:   '🧬 Mutual match!',
        message: `${candidateName || 'A candidate'} is also interested in ${jobTitle}. Time to connect →`,
        type:    'match',
        route:   'emp-candidates',
        email:   employerEmail ? {
          to:      employerEmail,
          subject: `🧬 Mutual match on ${jobTitle}`,
          html:    emailHtml({
            title:  `Mutual match on ${jobTitle}`,
            body:   `A candidate who matches your team's Work DNA has also expressed interest in <strong style="color:#fff">${jobTitle}</strong>. You're now a mutual match — respond within 72h to keep your Ghosting Score healthy.`,
            ctaText: 'View candidate',
            ctaUrl:  `${APP_URL}/candidates`,
          }),
          text: `You have a mutual match on ${jobTitle}. Log in to view the candidate: ${APP_URL}`,
        } : null,
      }),
    ]);
  } else {
    // One-way: tell employer a candidate is interested
    await sendNotification(app.employerId, {
      title:   '👋 New interest',
      message: `${candidateName || 'A candidate'} is interested in ${jobTitle}.`,
      type:    'interest',
      route:   'emp-candidates',
    });
  }
}

/**
 * Called after an employer expresses interest in a candidate.
 * If it's now mutual, notifies both parties.
 * Otherwise, notifies only the candidate.
 */
export async function notifyEmployerInterest({
  app,
  candidateName,
  jobTitle,
  companyName,
  candidateEmail = null,
  employerEmail  = null,
}) {
  const isMutual = app.candidateExpressedInterest && app.employerExpressedInterest;

  if (isMutual) {
    await notifyInterestExpressed({ app, candidateName, jobTitle, companyName, candidateEmail, employerEmail });
  } else {
    await sendNotification(app.candidateId, {
      title:   '✨ An employer noticed you',
      message: `${companyName} expressed interest in you for ${jobTitle}.`,
      type:    'match',
      route:   'cand-matches',
      email:   candidateEmail ? {
        to:      candidateEmail,
        subject: `${companyName} is interested in you`,
        html:    emailHtml({
          title:  `${companyName} is interested in you`,
          body:   `${companyName} has expressed interest in you for <strong style="color:#fff">${jobTitle}</strong>.<br><br>If you're also interested, express your interest to create a mutual match and open a direct conversation.`,
          ctaText: 'View role',
          ctaUrl:  `${APP_URL}/matches`,
        }),
        text: `${companyName} expressed interest in you for ${jobTitle}. Log in to view: ${APP_URL}`,
      } : null,
    });
  }
}

/**
 * Called when an employer moves a candidate to a new pipeline stage.
 */
export async function notifyStageChange({
  candidateId,
  candidateEmail = null,
  companyName,
  jobTitle,
  stage,
}) {
  const label = {
    shortlist: 'Shortlisted',
    interview: 'Interview invited',
    final:     'Final round',
    offer:     'Offer sent',
    rejected:  'Process closed',
  }[stage?.toLowerCase()] ?? stage;

  const isOffer = stage?.toLowerCase() === 'offer';

  await sendNotification(candidateId, {
    title:   `${label}: ${companyName}`,
    message: `Your application for ${jobTitle} at ${companyName} has been updated to ${label}.`,
    type:    isOffer ? 'offer' : 'stage',
    route:   isOffer ? 'cand-apps' : 'cand-apps',
    email:   candidateEmail ? {
      to:      candidateEmail,
      subject: `${label} — ${companyName} · ${jobTitle}`,
      html:    emailHtml({
        title:  `${label} at ${companyName}`,
        body:   `Your application for <strong style="color:#fff">${jobTitle}</strong> at ${companyName} has been updated.<br><br>New status: <strong style="color:#6c47ff">${label}</strong>`,
        ctaText: isOffer ? 'View offer' : 'View application',
        ctaUrl:  `${APP_URL}/applications`,
      }),
      text: `Your ${jobTitle} application at ${companyName} is now ${label}. View: ${APP_URL}`,
    } : null,
  });
}

/**
 * Called when a new message is sent.
 * Only call this if the recipient is NOT currently viewing the conversation.
 */
export async function notifyNewMessage({
  recipientId,
  recipientEmail = null,
  senderName,
  preview,
}) {
  await sendNotification(recipientId, {
    title:   `New message from ${senderName}`,
    message: preview?.slice(0, 100) || 'You have a new message.',
    type:    'message',
    route:   'cand-messages',
    email:   recipientEmail ? {
      to:      recipientEmail,
      subject: `New message from ${senderName} on Hiro`,
      html:    emailHtml({
        title:  `Message from ${senderName}`,
        body:   preview
          ? `&ldquo;${preview.slice(0, 200)}${preview.length > 200 ? '&hellip;' : ''}&rdquo;`
          : 'You have a new message on Hiro.',
        ctaText: 'Reply',
        ctaUrl:  `${APP_URL}/messages`,
      }),
      text: `${senderName}: ${preview || 'New message'}. Reply: ${APP_URL}/messages`,
    } : null,
  });
}
