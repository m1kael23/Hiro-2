/**
 * InterviewScheduler.jsx — Native Interview Scheduling Modal
 *
 * Replaces the "Schedule interview" toast in EmpPipeline.
 * Fully self-contained modal — import and drop in anywhere.
 *
 * Usage:
 *   import InterviewScheduler from '../shared/InterviewScheduler';
 *
 *   <InterviewScheduler
 *     open={scheduleOpen}
 *     onClose={() => setScheduleOpen(false)}
 *     applicationId="abc123"
 *     candidateName="Jordan Mitchell"
 *     jobTitle="Senior PM — Payments"
 *     candidateId="uid_candidate"
 *     employerId="uid_employer"
 *   />
 *
 * Firestore writes:
 *   interviews/{id}
 *     applicationId, candidateId, employerId,
 *     jobTitle, date (ISO), time (HH:MM), durationMins,
 *     format ('video' | 'phone' | 'in-person'),
 *     meetingLink, notes, stage (number),
 *     status: 'scheduled',
 *     createdAt, updatedAt
 *
 *   applications/{applicationId}
 *     interviewConfirmed: true
 *     interviewScheduledAt: serverTimestamp()
 *     nextInterviewDate: ISO date string
 *
 *   notifications/{id}   → candidate notified
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection, addDoc, updateDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth }   from '../../context/AuthContext';
import { useApp }    from '../../context/AppContext';

/* ── Calendar helpers ───────────────────────────────────────────── */
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}
function isoDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function isPast(y, m, d) {
  const today = new Date(); today.setHours(0,0,0,0);
  return new Date(y, m, d) < today;
}
function isToday(y, m, d) {
  const t = new Date();
  return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d;
}
function isWeekend(y, m, d) {
  const dow = new Date(y, m, d).getDay();
  return dow === 0 || dow === 6;
}
function friendlyDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/* ── Time slots — business hours only ──────────────────────────── */
const TIME_SLOTS = [];
for (let h = 8; h <= 18; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2,'0')}:00`);
  if (h < 18) TIME_SLOTS.push(`${String(h).padStart(2,'0')}:30`);
}

/* ── Duration options ────────────────────────────────────────────── */
const DURATIONS = [
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hrs', value: 90 },
  { label: '2 hours', value: 120 },
];

/* ── Format options ─────────────────────────────────────────────── */
const FORMATS = [
  { value: 'video',     label: 'Video call', icon: '📹' },
  { value: 'phone',     label: 'Phone call', icon: '📞' },
  { value: 'in-person', label: 'In person',  icon: '🏢' },
];

/* ── Stage labels ───────────────────────────────────────────────── */
const STAGES = [
  { value: 1, label: 'Stage 1 — Intro screen' },
  { value: 2, label: 'Stage 2 — Technical' },
  { value: 3, label: 'Stage 3 — Culture fit' },
  { value: 4, label: 'Stage 4 — Final round' },
  { value: 5, label: 'Stage 5 — Exec review' },
];

/* ── Mini calendar ──────────────────────────────────────────────── */
function MiniCalendar({ selected, onSelect }) {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  function prev() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function next() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const numDays  = daysInMonth(viewYear, viewMonth);
  const startDow = firstDayOfMonth(viewYear, viewMonth);
  const cells    = [];

  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= numDays; d++) cells.push(d);

  return (
    <div style={{ userSelect: 'none' }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12 }}>
        <button onClick={prev} style={{ background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text2)', fontSize: 16, padding: '2px 8px', borderRadius: 6,
          transition: 'color .15s' }}>‹</button>
        <div style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 700, fontSize: 14 }}>
          {MONTHS[viewMonth]} {viewYear}
        </div>
        <button onClick={next} style={{ background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text2)', fontSize: 16, padding: '2px 8px', borderRadius: 6,
          transition: 'color .15s' }}>›</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 2, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700,
            color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em',
            padding: '3px 0' }}>{d}</div>
        ))}
      </div>

      {/* Date cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`}/>;
          const iso      = isoDate(viewYear, viewMonth, day);
          const past     = isPast(viewYear, viewMonth, day);
          const weekend  = isWeekend(viewYear, viewMonth, day);
          const todayBol = isToday(viewYear, viewMonth, day);
          const selBol   = selected === iso;
          const disabled = past;

          return (
            <button
              key={iso}
              onClick={() => !disabled && onSelect(iso)}
              disabled={disabled}
              style={{
                padding: '6px 2px', borderRadius: 7, border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontFamily: 'Manrope,sans-serif', fontSize: 12, fontWeight: 600,
                transition: 'all .12s',
                background: selBol
                  ? 'linear-gradient(135deg, var(--violet), #4338ca)'
                  : todayBol
                  ? 'rgba(108,71,255,.15)'
                  : 'transparent',
                color: disabled
                  ? 'var(--text3)'
                  : selBol
                  ? '#fff'
                  : todayBol
                  ? 'var(--violet)'
                  : weekend
                  ? 'var(--text3)'
                  : 'var(--text)',
                boxShadow: selBol ? '0 2px 8px rgba(108,71,255,.4)' : 'none',
                outline: todayBol && !selBol ? '1px solid rgba(108,71,255,.4)' : 'none',
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Time slot picker ───────────────────────────────────────────── */
function TimePicker({ selected, onSelect }) {
  const morning = TIME_SLOTS.filter(t => parseInt(t) < 12);
  const afternoon = TIME_SLOTS.filter(t => parseInt(t) >= 12);

  function TimeGroup({ label, slots }) {
    return (
      <>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 6, marginTop: 10 }}>
          {label}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {slots.map(t => {
            const active = selected === t;
            return (
              <button key={t} onClick={() => onSelect(t)}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: '1px solid',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  transition: 'all .12s',
                  borderColor:  active ? 'var(--violet)' : 'var(--border2)',
                  background:   active ? 'var(--violet-lt)' : 'rgba(255,255,255,.04)',
                  color:        active ? '#a78bfa' : 'var(--text2)',
                  boxShadow:    active ? '0 0 0 1px var(--violet)' : 'none',
                }}>
                {t}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <div>
      <TimeGroup label="Morning" slots={morning}/>
      <TimeGroup label="Afternoon" slots={afternoon}/>
    </div>
  );
}

/* ── Write to Firestore + notify candidate ─────────────────────── */
async function saveInterview({ applicationId, candidateId, employerId,
  jobTitle, date, time, durationMins, format, meetingLink, notes, stage }) {

  // 1. Create interview document
  const interviewRef = await addDoc(collection(db, 'interviews'), {
    applicationId, candidateId, employerId,
    jobTitle:     jobTitle || '',
    date, time, durationMins, format,
    meetingLink:  meetingLink || '',
    notes:        notes || '',
    stage:        stage || 1,
    status:       'scheduled',
    createdAt:    serverTimestamp(),
    updatedAt:    serverTimestamp(),
  });

  // 2. Update application record
  if (applicationId) {
    try {
      await updateDoc(doc(db, 'applications', applicationId), {
        interviewConfirmed:    true,
        interviewScheduledAt:  serverTimestamp(),
        nextInterviewDate:     date,
      });
    } catch {
      // non-fatal — interview doc is the source of truth
    }
  }

  // 3. Notify candidate
  if (candidateId) {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId:    candidateId,
        type:      'interview_scheduled',
        title:     '📅 Interview scheduled',
        body:      `Your interview for ${jobTitle || 'a role'} is confirmed for ${friendlyDate(date)} at ${time}`,
        route:     'cand-apps',
        read:      false,
        createdAt: serverTimestamp(),
        meta: { interviewId: interviewRef.id, date, time, format },
      });
    } catch {
      // non-fatal — notification is best-effort
    }
  }

  return interviewRef.id;
}

/* ── Main modal component ───────────────────────────────────────── */
export default function InterviewScheduler({
  open,
  onClose,
  applicationId,
  candidateName,
  jobTitle,
  candidateId,
  employerId,
  initialStage = 1,
  onScheduled,    // optional callback(interviewId)
}) {
  const { showToast } = useApp();

  const [step,        setStep]        = useState(1); // 1=date, 2=time, 3=details, 4=confirm
  const [selDate,     setSelDate]     = useState('');
  const [selTime,     setSelTime]     = useState('');
  const [duration,    setDuration]    = useState(60);
  const [format,      setFormat]      = useState('video');
  const [meetingLink, setMeetingLink] = useState('');
  const [notes,       setNotes]       = useState('');
  const [stage,       setStage]       = useState(initialStage);
  const [saving,      setSaving]      = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1); setSelDate(''); setSelTime('');
      setDuration(60); setFormat('video'); setMeetingLink('');
      setNotes(''); setStage(initialStage);
    }
  }, [open, initialStage]);

  const canNext = step === 1 ? !!selDate
                : step === 2 ? !!selTime
                : step === 3 ? true
                : false;

  async function handleConfirm() {
    setSaving(true);
    try {
      const id = await saveInterview({
        applicationId, candidateId, employerId,
        jobTitle, date: selDate, time: selTime,
        durationMins: duration, format, meetingLink, notes, stage,
      });
      showToast(`Interview scheduled — ${candidateName || 'candidate'} has been notified 📅`, 'success');
      if (onScheduled) onScheduled(id);
      onClose();
    } catch (e) {
      console.error('saveInterview error:', e);
      showToast('Failed to schedule — please try again', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  /* ── Step indicators ──────────────────────────────────────────── */
  const STEPS = ['Date', 'Time', 'Details', 'Confirm'];

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(6,7,15,.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      {/* Modal panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 20, width: '100%', maxWidth: 520,
          maxHeight: '92vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 32px 80px rgba(0,0,0,.7)',
          animation: 'fadeUp .2s ease',
        }}
      >
        {/* ── Modal header ────────────────────────────────── */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 800, fontSize: 18,
              letterSpacing: '-0.03em', marginBottom: 2 }}>
              📅 Schedule interview
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
              {candidateName || 'Candidate'} · {jobTitle || 'Role'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text3)', fontSize: 20, lineHeight: 1, padding: '2px 6px',
            borderRadius: 6, transition: 'color .15s' }}>✕</button>
        </div>

        {/* ── Step indicator ──────────────────────────────── */}
        <div style={{ padding: '14px 24px 0', display: 'flex', gap: 6, alignItems: 'center' }}>
          {STEPS.map((lbl, i) => {
            const idx  = i + 1;
            const done = idx < step;
            const cur  = idx === step;
            return (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  background: done ? 'var(--green)' : cur ? 'var(--violet)' : 'var(--surface2)',
                  border:     done ? 'none' : cur ? 'none' : '1px solid var(--border2)',
                  color:      done || cur ? '#fff' : 'var(--text3)',
                  transition: 'all .2s',
                }}>
                  {done ? '✓' : idx}
                </div>
                <span style={{ fontSize: 12, fontWeight: cur ? 700 : 500,
                  color: cur ? 'var(--text)' : done ? 'var(--text2)' : 'var(--text3)',
                  transition: 'color .2s' }}>
                  {lbl}
                </span>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 20, height: 1, background: done ? 'var(--green)' : 'var(--border)',
                    transition: 'background .2s' }}/>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step content ────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>

          {/* STEP 1 — Pick date */}
          {step === 1 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 16 }}>
                Select a date for the interview
              </div>
              <MiniCalendar selected={selDate} onSelect={setSelDate}/>
              {selDate && (
                <div style={{
                  marginTop: 14, padding: '10px 14px', borderRadius: 10,
                  background: 'var(--violet-lt)', border: '1px solid var(--border2)',
                  fontSize: 13, fontWeight: 600, color: '#a78bfa',
                }}>
                  📅 {friendlyDate(selDate)}
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — Pick time */}
          {step === 2 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>
                Select a time slot
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
                {friendlyDate(selDate)} · All times in your local timezone
              </div>
              <TimePicker selected={selTime} onSelect={setSelTime}/>
            </div>
          )}

          {/* STEP 3 — Details */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Format */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 8 }}>
                  Interview format
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {FORMATS.map(f => (
                    <button key={f.value} onClick={() => setFormat(f.value)}
                      style={{
                        flex: 1, padding: '10px 8px', borderRadius: 10,
                        border: `1px solid ${format === f.value ? 'var(--violet)' : 'var(--border2)'}`,
                        background: format === f.value ? 'var(--violet-lt)' : 'rgba(255,255,255,.04)',
                        cursor: 'pointer', transition: 'all .12s',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      }}>
                      <span style={{ fontSize: 20 }}>{f.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 600,
                        color: format === f.value ? '#a78bfa' : 'var(--text2)' }}>
                        {f.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 8 }}>
                  Duration
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DURATIONS.map(d => (
                    <button key={d.value} onClick={() => setDuration(d.value)}
                      style={{
                        padding: '7px 14px', borderRadius: 8,
                        border: `1px solid ${duration === d.value ? 'var(--violet)' : 'var(--border2)'}`,
                        background: duration === d.value ? 'var(--violet-lt)' : 'rgba(255,255,255,.04)',
                        color: duration === d.value ? '#a78bfa' : 'var(--text2)',
                        fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all .12s',
                      }}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interview stage */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 8 }}>
                  Interview stage
                </div>
                <select
                  value={stage}
                  onChange={e => setStage(Number(e.target.value))}
                  className="sel"
                  style={{ maxWidth: 300 }}
                >
                  {STAGES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Meeting link (video only) */}
              {format === 'video' && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 8 }}>
                    Meeting link
                    <span style={{ color: 'var(--text3)', fontWeight: 400,
                      textTransform: 'none', letterSpacing: 0 }}> (optional)</span>
                  </div>
                  <input
                    type="url" placeholder="https://meet.google.com/..."
                    value={meetingLink}
                    onChange={e => setMeetingLink(e.target.value)}
                    className="inp"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 8 }}>
                  Notes for candidate
                  <span style={{ color: 'var(--text3)', fontWeight: 400,
                    textTransform: 'none', letterSpacing: 0 }}> (optional)</span>
                </div>
                <textarea
                  placeholder="e.g. 'Bring one example of a product you've shipped…'"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="textarea"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
          )}

          {/* STEP 4 — Confirm summary */}
          {step === 4 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 16 }}>
                Confirm the details and schedule
              </div>

              {/* Summary card */}
              <div style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '18px 20px', marginBottom: 14,
              }}>
                {[
                  { icon: '👤', label: 'Candidate', val: candidateName || 'Unknown' },
                  { icon: '💼', label: 'Role',      val: jobTitle || '—' },
                  { icon: '📅', label: 'Date',      val: friendlyDate(selDate) },
                  { icon: '🕐', label: 'Time',      val: `${selTime} · ${DURATIONS.find(d => d.value === duration)?.label}` },
                  { icon: '🎯', label: 'Stage',     val: STAGES.find(s => s.value === stage)?.label },
                  { icon: FORMATS.find(f => f.value === format)?.icon, label: 'Format', val: FORMATS.find(f => f.value === format)?.label },
                  ...(meetingLink ? [{ icon: '🔗', label: 'Link', val: meetingLink }] : []),
                  ...(notes ? [{ icon: '📝', label: 'Notes', val: notes }] : []),
                ].map(row => (
                  <div key={row.label} style={{
                    display: 'flex', gap: 12, padding: '8px 0',
                    borderBottom: '1px solid rgba(255,255,255,.05)',
                  }}>
                    <span style={{ fontSize: 16, flexShrink: 0, width: 24, textAlign: 'center' }}>{row.icon}</span>
                    <span style={{ fontSize: 12, color: 'var(--text3)', width: 70, flexShrink: 0, paddingTop: 1 }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1, wordBreak: 'break-word' }}>{row.val}</span>
                  </div>
                ))}
              </div>

              {/* Confirmation notice */}
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)',
                fontSize: 12, color: 'var(--text2)', lineHeight: 1.6,
              }}>
                ✅ <strong style={{ color: 'var(--green)' }}>
                  {candidateName || 'The candidate'} will receive a notification on Hiro
                </strong> with all the details above. Both parties can view the interview
                in their Applications / Pipeline views.
              </div>
            </div>
          )}
        </div>

        {/* ── Footer navigation ─────────────────────────────── */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} className="btn btn-back btn-sm">
              ← Back
            </button>
          )}
          <button onClick={onClose} className="btn btn-ghost btn-sm">Cancel</button>
          {step < 4 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext}
              className="btn btn-violet btn-sm"
              style={{ opacity: canNext ? 1 : .45, cursor: canNext ? 'pointer' : 'not-allowed' }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="btn btn-violet btn-sm"
              style={{ opacity: saving ? .7 : 1, minWidth: 140 }}
            >
              {saving ? (
                <><div style={{ width: 12, height: 12, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff',
                  animation: 'spin .7s linear infinite' }}/> Scheduling…</>
              ) : '📅 Confirm & schedule'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
