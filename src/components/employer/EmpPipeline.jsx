import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp,
  getDocs, addDoc, setDoc, getDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { analyzeTrajectory } from '../../services/geminiService';
import { scoreCandidateForJob } from '../../lib/matchStore';

const DEFAULT_PLAYBOOK = {
  screen: {
    label: 'Recruiter Screen', duration: '30 min', interviewer: 'Recruiter',
    focus: 'Motivation, basics, logistics',
    questions: [
      { id: 'sq1', q: 'What drew you to this role specifically?', tag: 'Motivation' },
      { id: 'sq2', q: 'Walk me through your career trajectory — what led you here?', tag: 'Background' },
      { id: 'sq3', q: 'What does your ideal next company look like?', tag: 'Culture fit' },
      { id: 'sq4', q: 'What is your current compensation and target?', tag: 'Logistics' },
      { id: 'sq5', q: 'What is your notice period and earliest start date?', tag: 'Logistics' },
      { id: 'sq6', q: 'Are you interviewing elsewhere? Where are you in those processes?', tag: 'Urgency' },
    ],
    scorecard: [
      { id: 'ss1', label: 'Communication clarity' },
      { id: 'ss2', label: 'Motivation authenticity' },
      { id: 'ss3', label: 'Logistics fit (salary/notice)' },
      { id: 'ss4', label: 'Culture alignment' },
    ],
  },
  r1: {
    label: 'Round 1 — Hiring Manager', duration: '60 min', interviewer: 'Hiring Manager',
    focus: 'Experience depth, product thinking, leadership',
    questions: [
      { id: 'r1q1', q: 'Tell me about a product you owned end-to-end. What was hard about it?', tag: 'Product depth' },
      { id: 'r1q2', q: 'How do you decide what NOT to build?', tag: 'Prioritisation' },
      { id: 'r1q3', q: 'Describe a time your data was wrong and you shipped anyway. What happened?', tag: 'Judgement' },
      { id: 'r1q4', q: 'How do you handle a stakeholder who wants to override your roadmap?', tag: 'Influence' },
      { id: 'r1q5', q: 'What does good look like for this role in 90 days?', tag: 'Self-awareness' },
      { id: 'r1q6', q: 'Tell me about your biggest professional failure. What would you do differently?', tag: 'Resilience' },
      { id: 'r1q7', q: 'How do you think about the relationship between design, eng, and PM?', tag: 'Cross-functional' },
    ],
    scorecard: [
      { id: 'r1s1', label: 'Product depth & ownership' },
      { id: 'r1s2', label: 'Prioritisation rigour' },
      { id: 'r1s3', label: 'Judgement under ambiguity' },
      { id: 'r1s4', label: 'Stakeholder influence' },
      { id: 'r1s5', label: 'Self-awareness & growth' },
    ],
  },
  r2: {
    label: 'Round 2 — Case Study / Panel', duration: '90 min', interviewer: 'Panel (2-3 interviewers)',
    focus: 'Structured thinking, culture, case presentation',
    questions: [
      { id: 'r2q1', q: '[CASE] Present your take on our biggest product opportunity. Walk us through your thinking.', tag: 'Case' },
      { id: 'r2q2', q: 'What assumptions did you make and how would you validate them?', tag: 'Rigour' },
      { id: 'r2q3', q: 'How would you measure success for the thing you just proposed?', tag: 'Metrics' },
      { id: 'r2q4', q: 'If you joined tomorrow, what would you do in your first 30 days?', tag: '30-day plan' },
      { id: 'r2q5', q: 'What would make you turn down an offer from us?', tag: 'Conviction' },
      { id: 'r2q6', q: 'What questions do you have for us that you have not asked yet?', tag: 'Curiosity' },
    ],
    scorecard: [
      { id: 'r2s1', label: 'Structured problem solving' },
      { id: 'r2s2', label: 'Metrics & measurement' },
      { id: 'r2s3', label: 'Cultural conviction' },
      { id: 'r2s4', label: 'Panel communication' },
    ],
  },
  offer: {
    label: 'Offer Stage', duration: '—', interviewer: 'Recruiter + HM',
    focus: 'Reference checks, comp negotiation, closing',
    questions: [
      { id: 'oq1', q: 'We would like to make an offer — what questions do you have before we proceed?', tag: 'Pre-offer' },
      { id: 'oq2', q: '[REFERENCE] What was this person\'s biggest strength as a colleague?', tag: 'Reference' },
      { id: 'oq3', q: '[REFERENCE] What was their biggest area for development?', tag: 'Reference' },
      { id: 'oq4', q: 'Is there anything that would prevent you from accepting an offer today?', tag: 'Closing' },
      { id: 'oq5', q: 'Beyond base, what matters to you in the total package?', tag: 'Negotiation' },
    ],
    scorecard: [
      { id: 'os1', label: 'Reference quality' },
      { id: 'os2', label: 'Comp negotiation outcome' },
      { id: 'os3', label: 'Time-to-accept' },
      { id: 'os4', label: 'Closing confidence' },
    ],
  },
};

const COLS = [
  { id: 'matched', label: 'Matched', sub: 'Hiro found · review & invite' },
  { id: 'screen',  label: 'Screen',  sub: 'Recruiter screen · 30 min', add: true },
  { id: 'r1',      label: 'Round 1', sub: 'Hiring manager · 60 min', add: true },
  { id: 'r2',      label: 'Round 2', sub: 'Case study / panel · 90 min', add: true },
  { id: 'offer',   label: 'Offer',   sub: 'Offer out · awaiting decision' },
  { id: 'hired',   label: 'Hired',   sub: 'Onboarding · 30-day pulse active', hired: true },
];

const STAGE_ORDER = ['matched', 'screen', 'r1', 'r2', 'offer', 'hired'];

function uid() { return Math.random().toString(36).slice(2, 9); }

function StatBox({ label, value }) {
  return (
    <div style={{ padding: '8px 10px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border2)' }}>
      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{value}</div>
    </div>
  );
}

function AgeBadge({ days, col }) {
  if (['matched', 'hired'].includes(col) || days == null) return null;
  let cls, text;
  if (days <= 2) { cls = 'fresh'; text = days === 0 ? 'Just moved' : `${days}d in stage`; }
  else if (days <= 4) { cls = 'warn'; text = `${days}d — follow up`; }
  else { cls = 'risk'; text = `${days}d — at risk`; }
  return <div className={`pc-age ${cls}`}>{text}</div>;
}

// ── History accordion (previous stages) ──────────────────────────
function HistoryAccordion({ stage, data, pb, avgScore }) {
  const [open, setOpen] = useState(false);
  const stageNames = { screen: 'Screen', r1: 'Round 1', r2: 'Round 2', offer: 'Offer' };
  return (
    <div style={{ border: '1px solid var(--border2)', borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: 6 }}>
      <div onClick={() => setOpen(p => !p)} style={{ padding: '9px 14px', background: 'rgba(255,255,255,.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{stageNames[stage] || stage}</span>
          {data.recommendation && <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 6, background: 'rgba(108,71,255,.1)', color: '#a78bfa', border: '1px solid rgba(108,71,255,.25)' }}>{data.recommendation}</span>}
          {avgScore && <span style={{ fontSize: 11, color: 'var(--text3)' }}>Avg {avgScore}/5</span>}
        </div>
        <span style={{ fontSize: 14, color: 'var(--text3)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s', display: 'inline-block' }}>›</span>
      </div>
      {open && (
        <div style={{ padding: '12px 14px' }}>
          {pb && pb.questions && pb.questions.map((q, i) => {
            const note = data.questionNotes && data.questionNotes[q.id];
            if (!note) return null;
            return (
              <div key={q.id} style={{ marginBottom: 8, padding: '8px 10px', background: 'rgba(255,255,255,.02)', borderRadius: 6, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>Q{i + 1}: {q.q}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{note}</div>
              </div>
            );
          })}
          {pb && pb.scorecard && pb.scorecard.map(s => {
            const sc = data.scores && data.scores[s.id];
            const sn = data.scoreNotes && data.scoreNotes[s.id];
            if (!sc && !sn) return null;
            return (
              <div key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1 }}>{s.label}</span>
                {sc && <span style={{ fontSize: 12, color: 'var(--violet)', fontWeight: 700 }}>{'★'.repeat(sc)}{'☆'.repeat(5 - sc)}</span>}
                {sn && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{sn}</span>}
              </div>
            );
          })}
          {data.overallNote && (
            <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(255,255,255,.02)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.1em' }}>Overall Notes</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{data.overallNote}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Playbook Tab ──────────────────────────────────────────────────
function PlaybookTab({ cand, col, playbook, jobId, showToast }) {
  const { profile } = useAuth();
  const pb = playbook[col] || playbook.screen;
  const [scores, setScores] = useState({});
  const [scoreNotes, setScoreNotes] = useState({});
  const [questionNotes, setQuestionNotes] = useState({});
  const [overallNote, setOverallNote] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stageHistory, setStageHistory] = useState({});
  const saveTimerRef = useRef(null);

  useEffect(() => {
    if (!cand || !cand.id || !jobId || !profile?.id) { setLoading(false); return; }
    setLoading(true);
    setScores({}); setScoreNotes({}); setQuestionNotes({}); setOverallNote(''); setRecommendation(''); setSubmitted(false); setSubmittedAt(null);
    const docRef = doc(db, 'playbookNotes', `${jobId}_${cand.id}_${col}`);
    getDoc(docRef).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setScores(data.scores || {});
        setScoreNotes(data.scoreNotes || {});
        setQuestionNotes(data.questionNotes || {});
        setOverallNote(data.overallNote || '');
        setRecommendation(data.recommendation || '');
        setSubmitted(data.submitted || false);
        setSubmittedAt(data.submittedAt || null);
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    const prevStages = STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(col));
    const historyMap = {};
    Promise.all(prevStages.filter(s => ['screen','r1','r2','offer'].includes(s)).map(async stage => {
      try {
        const ref = doc(db, 'playbookNotes', `${jobId}_${cand.id}_${stage}`);
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data().submitted) historyMap[stage] = snap.data();
      } catch (e) {}
    })).then(() => setStageHistory({ ...historyMap }));
  }, [cand && cand.id, jobId, col, profile?.id]);

  const buildPayload = useCallback((overrides = {}) => ({
    scores, scoreNotes, questionNotes, overallNote, recommendation, submitted,
    candId: cand && cand.id, jobId, stage: col, employerId: profile?.id, ...overrides,
  }), [scores, scoreNotes, questionNotes, overallNote, recommendation, submitted, cand, jobId, col, profile?.id]);

  const autoSave = useCallback((payload) => {
    if (!cand || !cand.id || !jobId || !profile?.id) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const docRef = doc(db, 'playbookNotes', `${jobId}_${cand.id}_${col}`);
        await setDoc(docRef, { ...payload, updatedAt: serverTimestamp() }, { merge: true });
      } catch (e) {}
    }, 800);
  }, [cand && cand.id, jobId, col, profile?.id]);

  function setScore(id, val) {
    const next = { ...scores, [id]: val };
    setScores(next);
    autoSave({ scores: next, scoreNotes, questionNotes, overallNote, recommendation });
  }
  function setScoreNote(id, val) {
    const next = { ...scoreNotes, [id]: val };
    setScoreNotes(next);
    autoSave({ scores, scoreNotes: next, questionNotes, overallNote, recommendation });
  }
  function setQNote(id, val) {
    const next = { ...questionNotes, [id]: val };
    setQuestionNotes(next);
    autoSave({ scores, scoreNotes, questionNotes: next, overallNote, recommendation });
  }
  function onOverall(val) {
    setOverallNote(val);
    autoSave({ scores, scoreNotes, questionNotes, overallNote: val, recommendation });
  }
  function onRec(val) {
    setRecommendation(val);
    autoSave({ scores, scoreNotes, questionNotes, overallNote, recommendation: val });
  }

  async function handleSubmit() {
    if (!cand || !cand.id || !jobId || !profile?.id) return;
    const now = new Date().toISOString();
    const docRef = doc(db, 'playbookNotes', `${jobId}_${cand.id}_${col}`);
    await setDoc(docRef, { scores, scoreNotes, questionNotes, overallNote, recommendation, submitted: true, submittedAt: now, candId: cand.id, jobId, stage: col, employerId: profile.id, updatedAt: serverTimestamp() }, { merge: true });
    setSubmitted(true); setSubmittedAt(now);
    showToast('Scorecard submitted — hiring team notified', 'success');
  }

  const avgScore = useMemo(() => {
    const vals = Object.values(scores).filter(Boolean);
    if (!vals.length) return null;
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  }, [scores]);

  const recOptions = ['Strong Yes', 'Yes', 'Maybe', 'No', 'Strong No'];

  if (loading) return <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)', fontSize: 13 }}>Loading playbook...</div>;

  return (
    <div>
      {/* Stage banner */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, padding: '10px 14px', background: 'rgba(108,71,255,.06)', border: '1px solid rgba(108,71,255,.2)', borderRadius: 'var(--r)', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa' }}>{pb.label}</span>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>·</span>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>⏱ {pb.duration}</span>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>·</span>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>👤 {pb.interviewer}</span>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>·</span>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>🎯 {pb.focus}</span>
        {submitted && (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--green)', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.25)', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>
            ✓ Submitted {submittedAt ? new Date(submittedAt).toLocaleDateString() : ''}
          </span>
        )}
      </div>

      {/* Previous stage history */}
      {Object.keys(stageHistory).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text3)', marginBottom: 8 }}>Previous Stage Notes</div>
          {Object.entries(stageHistory).map(([stage, data]) => {
            const avg2 = Object.values(data.scores || {}).filter(Boolean);
            const avgVal2 = avg2.length ? (avg2.reduce((a, b) => a + b, 0) / avg2.length).toFixed(1) : null;
            return <HistoryAccordion key={stage} stage={stage} data={data} pb={playbook[stage]} avgScore={avgVal2} />;
          })}
        </div>
      )}

      {/* Questions */}
      <div style={{ marginBottom: 16 }}>
        <div className="cpanel-section-title">Interview Questions</div>
        {pb.questions.map((q, i) => (
          <div key={q.id} style={{ marginBottom: 10, padding: '10px 12px', background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet)', flexShrink: 0, width: 18 }}>{i + 1}</span>
              <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1, lineHeight: 1.5 }}>{q.q}</span>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'rgba(255,255,255,.06)', color: 'var(--text3)', whiteSpace: 'nowrap', flexShrink: 0 }}>{q.tag}</span>
            </div>
            <textarea
              placeholder="Notes on candidate's answer..."
              value={questionNotes[q.id] || ''}
              onChange={e => setQNote(q.id, e.target.value)}
              rows={2}
              style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border2)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 11, resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' }}
            />
          </div>
        ))}
      </div>

      {/* Scorecard */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="cpanel-section-title" style={{ marginBottom: 0 }}>Scorecard</div>
          {avgScore && <div style={{ fontSize: 12, fontWeight: 700, color: Number(avgScore) >= 4 ? 'var(--green)' : Number(avgScore) >= 3 ? 'var(--amber)' : '#f87171' }}>Avg: {avgScore}/5</div>}
        </div>
        {pb.scorecard.map((s) => (
          <div key={s.id} style={{ marginBottom: 8, padding: '10px 12px', background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
            <div className="scorecard-item" style={{ marginBottom: 4 }}>
              <span className="scorecard-label">{s.label}</span>
              <div className="scorecard-stars">
                {[1,2,3,4,5].map(star => (
                  <span key={star} className={`scorecard-star${(scores[s.id] || 0) >= star ? ' lit' : ''}`} onClick={() => setScore(s.id, star)} title={['','Poor','Below avg','Average','Good','Excellent'][star]}>★</span>
                ))}
              </div>
              {scores[s.id] && <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>{['','Poor','Below avg','Average','Good','Excellent'][scores[s.id]]}</span>}
            </div>
            <input
              placeholder="Note on this criterion..."
              value={scoreNotes[s.id] || ''}
              onChange={e => setScoreNote(s.id, e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border2)', borderRadius: 5, padding: '5px 8px', color: 'var(--text2)', fontSize: 11, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
        ))}
      </div>

      {/* Overall notes */}
      <div style={{ marginBottom: 14 }}>
        <div className="cpanel-section-title">Overall Interview Notes</div>
        <textarea
          placeholder="Overall impressions, key observations, culture fit notes..."
          value={overallNote}
          onChange={e => onOverall(e.target.value)}
          rows={4}
          style={{ width: '100%', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border2)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 12, resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box' }}
        />
      </div>

      {/* Recommendation */}
      <div style={{ marginBottom: 14 }}>
        <div className="cpanel-section-title">Recommendation</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {recOptions.map(opt => (
            <button key={opt} onClick={() => onRec(opt)} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s', border: '1px solid', background: recommendation === opt ? 'rgba(108,71,255,.2)' : 'rgba(255,255,255,.04)', borderColor: recommendation === opt ? 'var(--violet)' : 'var(--border2)', color: recommendation === opt ? '#a78bfa' : 'var(--text3)' }}>{opt}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, fontSize: 11, color: 'var(--text3)' }}>💾 Auto-saves as you type</div>
        <button className="btn btn-violet btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSubmit}>
          {submitted ? '↻ Resubmit scorecard' : 'Submit scorecard →'}
        </button>
      </div>
    </div>
  );
}

// ── Playbook Editor Modal ─────────────────────────────────────────
function PlaybookEditorModal({ playbook, onSave, onClose }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(playbook)));
  const [activeStage, setActiveStage] = useState('screen');
  const [saving, setSaving] = useState(false);
  const stage = draft[activeStage];

  function updateMeta(field, val) { setDraft(p => ({ ...p, [activeStage]: { ...p[activeStage], [field]: val } })); }
  function updateQuestion(id, field, val) { setDraft(p => ({ ...p, [activeStage]: { ...p[activeStage], questions: p[activeStage].questions.map(q => q.id === id ? { ...q, [field]: val } : q) } })); }
  function addQuestion() { setDraft(p => ({ ...p, [activeStage]: { ...p[activeStage], questions: [...p[activeStage].questions, { id: uid(), q: '', tag: 'General' }] } })); }
  function removeQuestion(id) { setDraft(p => ({ ...p, [activeStage]: { ...p[activeStage], questions: p[activeStage].questions.filter(q => q.id !== id) } })); }
  function updateScorecard(id, val) { setDraft(p => ({ ...p, [activeStage]: { ...p[activeStage], scorecard: p[activeStage].scorecard.map(s => s.id === id ? { ...s, label: val } : s) } })); }
  function addScorecard() { setDraft(p => ({ ...p, [activeStage]: { ...p[activeStage], scorecard: [...p[activeStage].scorecard, { id: uid(), label: '' }] } })); }
  function removeScorecard(id) { setDraft(p => ({ ...p, [activeStage]: { ...p[activeStage], scorecard: p[activeStage].scorecard.filter(s => s.id !== id) } })); }

  async function handleSave() { setSaving(true); await onSave(draft); setSaving(false); onClose(); }

  const stageLabels = { screen: 'Screen', r1: 'Round 1', r2: 'Round 2', offer: 'Offer' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.65)' }}>
      <div style={{ width: 680, maxWidth: '96vw', maxHeight: '90vh', background: '#0d1020', border: '1px solid rgba(255,255,255,.12)', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,.7)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>📋 Edit Interview Playbook</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Customise questions and scorecard for each interview stage</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 8, width: 32, height: 32, color: 'var(--text2)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 2, padding: '10px 24px 0', borderBottom: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
          {Object.entries(stageLabels).map(([key, label]) => (
            <button key={key} onClick={() => setActiveStage(key)} style={{ padding: '7px 16px', borderRadius: '8px 8px 0 0', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all .15s', background: activeStage === key ? 'rgba(108,71,255,.2)' : 'none', color: activeStage === key ? '#a78bfa' : 'var(--text3)', borderBottom: `2px solid ${activeStage === key ? 'var(--violet)' : 'transparent'}` }}>{label}</button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[['Duration', 'duration'], ['Interviewer', 'interviewer'], ['Focus', 'focus']].map(([lbl, field]) => (
              <div key={field} className="field">
                <label>{lbl}</label>
                <input className="inp" value={stage[field]} onChange={e => updateMeta(field, e.target.value)} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text3)' }}>Interview Questions</div>
              <button className="btn btn-ghost btn-sm" onClick={addQuestion}>+ Add question</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stage.questions.map((q, i) => (
                <div key={q.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet)', flexShrink: 0, width: 20, paddingTop: 2 }}>{i + 1}</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <textarea value={q.q} onChange={e => updateQuestion(q.id, 'q', e.target.value)} rows={2} style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border2)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 12, resize: 'vertical', lineHeight: 1.5, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    <input value={q.tag} onChange={e => updateQuestion(q.id, 'tag', e.target.value)} placeholder="Tag" style={{ width: 140, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border2)', borderRadius: 6, padding: '4px 8px', color: 'var(--text3)', fontSize: 11, outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                  <button onClick={() => removeQuestion(q.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18, paddingTop: 2, flexShrink: 0, lineHeight: 1 }}>✕</button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text3)' }}>Scorecard Criteria</div>
              <button className="btn btn-ghost btn-sm" onClick={addScorecard}>+ Add criterion</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {stage.scorecard.map((s) => (
                <div key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input value={s.label} onChange={e => updateScorecard(s.id, e.target.value)} placeholder="Scorecard criterion..." className="inp" style={{ flex: 1 }} />
                  <button onClick={() => removeScorecard(s.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-violet" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : '✓ Save Playbook'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Offer Negotiation Tab ─────────────────────────────────────────
function OfferNegotiationTab({ cand, job, onMoveHired, navigate, showToast }) {
  const { profile } = useAuth();
  const [offerData, setOfferData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSendForm, setShowSendForm] = useState(false);

  // Form state for sending an offer
  const [baseSalary, setBaseSalary] = useState('');
  const [currency, setCurrency] = useState(job?.currency || '£');
  const [bonus, setBonus] = useState('');
  const [equity, setEquity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('3');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);

  // Counter-offer response form
  const [counterResponse, setCounterResponse] = useState('');
  const [counterAmount, setCounterAmount] = useState('');
  const [counterNotes, setCounterNotes] = useState('');
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    if (!cand?.id || !job?.id || !profile?.id) { setLoading(false); return; }
    const docRef = doc(db, 'offers', `${cand.id}_${job.id}`);
    const unsub = onSnapshot(docRef, snap => {
      setOfferData(snap.exists() ? snap.data() : null);
      setLoading(false);
    }, (err) => {
      console.error('OfferNegotiationTab: offers snapshot error', err);
      setLoading(false);
    });
    return () => unsub();
  }, [cand?.id, job?.id, profile?.id]);

  async function sendOffer() {
    if (!baseSalary) { showToast('Please enter a base salary', 'error'); return; }
    if (!profile?.id) return;
    setSending(true);
    try {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + parseInt(deadline || 3));
      const offerDoc = {
        jobId: job.id, candidateId: cand.id, jobTitle: job.title, employerId: profile.id,
        currency, baseSalary: parseInt(baseSalary), bonus, equity, startDate,
        deadline: deadlineDate.toISOString(), notes,
        status: 'sent', sentAt: serverTimestamp(), updatedAt: serverTimestamp(),
        history: [{
          type: 'offer_sent', at: new Date().toISOString(),
          by: 'employer', amount: parseInt(baseSalary), bonus, equity, notes,
          label: 'Initial offer sent',
        }],
      };
      await setDoc(doc(db, 'offers', `${cand.id}_${job.id}`), offerDoc);
      await addDoc(collection(db, 'notifications'), {
        userId: cand.id, title: 'You have an offer!',
        message: `${job.companyName} has sent you an offer for ${job.title}. Review and respond.`,
        type: 'offer', route: 'cand-apps', read: false, createdAt: serverTimestamp(),
      });
      setShowSendForm(false);
      showToast('Offer sent to candidate', 'success');
    } catch (e) { showToast('Failed to send offer', 'error'); }
    setSending(false);
  }

  async function respondToCounter(accept) {
    if (!accept && !counterAmount) { showToast('Enter revised amount or decline', 'error'); return; }
    setResponding(true);
    try {
      const newEntry = {
        type: accept ? 'employer_accepted_counter' : 'employer_counter',
        at: new Date().toISOString(), by: 'employer',
        amount: accept ? offerData.latestCounterAmount : parseInt(counterAmount),
        notes: counterNotes,
        label: accept ? 'Employer accepted counter-offer' : 'Employer revised offer',
      };
      const updatedHistory = [...(offerData.history || []), newEntry];
      const update = {
        status: accept ? 'accepted' : 'countered_by_employer',
        history: updatedHistory,
        updatedAt: serverTimestamp(),
        ...(accept ? { acceptedAt: serverTimestamp() } : { baseSalary: parseInt(counterAmount) }),
      };
      await setDoc(doc(db, 'offers', `${cand.id}_${job.id}`), update, { merge: true });
      await addDoc(collection(db, 'notifications'), {
        userId: cand.id,
        title: accept ? 'Offer accepted!' : 'Updated offer from employer',
        message: accept
          ? `Congratulations! ${job.companyName} has accepted your counter-offer.`
          : `${job.companyName} has revised their offer for ${job.title}.`,
        type: 'offer', route: 'cand-apps', read: false, createdAt: serverTimestamp(),
      });
      if (accept) { onMoveHired(); }
      setCounterResponse(''); setCounterAmount(''); setCounterNotes('');
      showToast(accept ? 'Counter-offer accepted — moving to Hired' : 'Revised offer sent', 'success');
    } catch (e) { showToast('Failed to update offer', 'error'); }
    setResponding(false);
  }

  async function declineOffer() {
    try {
      const newEntry = { type: 'offer_declined', at: new Date().toISOString(), by: 'employer', label: 'Employer withdrew offer' };
      await setDoc(doc(db, 'offers', `${cand.id}_${job.id}`), { status: 'withdrawn', history: [...(offerData?.history || []), newEntry], updatedAt: serverTimestamp() }, { merge: true });
      showToast('Offer withdrawn', 'default');
    } catch (e) { showToast('Failed to withdraw offer', 'error'); }
  }

  const statusColors = { sent: 'var(--cyan)', countered_by_candidate: 'var(--amber)', countered_by_employer: 'var(--violet)', accepted: 'var(--green)', withdrawn: '#f87171', declined: '#f87171' };
  const statusLabels = { sent: 'Offer sent — awaiting response', countered_by_candidate: 'Candidate countered — action needed', countered_by_employer: 'You revised — awaiting candidate', accepted: 'Accepted', withdrawn: 'Withdrawn', declined: 'Declined by candidate' };

  if (loading) return <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>Loading offer...</div>;

  return (
    <div className="cpanel-section">
      {/* No offer yet */}
      {!offerData && !showSendForm && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>No offer sent yet</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>Send a formal offer to {cand.full_name || cand.name} to start the negotiation process.</div>
          <button className="btn btn-violet" onClick={() => setShowSendForm(true)}>Send offer →</button>
        </div>
      )}

      {/* Send offer form */}
      {!offerData && showSendForm && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="cpanel-section-title" style={{ marginBottom: 0 }}>Send Offer</div>
            <button onClick={() => setShowSendForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, marginBottom: 10 }}>
            <div className="field">
              <label>Currency</label>
              <select className="sel" value={currency} onChange={e => setCurrency(e.target.value)}>
                {['£','$','€','kr','CHF'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Base salary (000s)</label>
              <input className="inp" type="number" placeholder="e.g. 128" value={baseSalary} onChange={e => setBaseSalary(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div className="field">
              <label>Bonus / variable</label>
              <input className="inp" placeholder="e.g. 15% annual" value={bonus} onChange={e => setBonus(e.target.value)} />
            </div>
            <div className="field">
              <label>Equity</label>
              <input className="inp" placeholder="e.g. 0.1%" value={equity} onChange={e => setEquity(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div className="field">
              <label>Proposed start date</label>
              <input className="inp" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Response deadline (days)</label>
              <input className="inp" type="number" placeholder="3" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Message to candidate</label>
            <textarea className="inp" placeholder="Any additional context or personal note..." rows={3} value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical', lineHeight: 1.5 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setShowSendForm(false)}>Cancel</button>
            <button className="btn btn-violet" style={{ flex: 1, justifyContent: 'center' }} onClick={sendOffer} disabled={sending}>{sending ? 'Sending...' : 'Send offer →'}</button>
          </div>
        </div>
      )}

      {/* Active offer + negotiation history */}
      {offerData && (
        <div>
          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '10px 14px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.03)', border: `1px solid ${statusColors[offerData.status] || 'var(--border2)'}20` }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Offer status</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: statusColors[offerData.status] || '#fff' }}>{statusLabels[offerData.status] || offerData.status}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{offerData.currency}{offerData.baseSalary}k</div>
              {offerData.bonus && <div style={{ fontSize: 11, color: 'var(--text3)' }}>+ {offerData.bonus}</div>}
            </div>
          </div>

          {/* Current offer stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            <StatBox label="Base salary" value={`${offerData.currency}${offerData.baseSalary}k`} />
            <StatBox label="Deadline" value={offerData.deadline ? `${Math.max(0, Math.ceil((new Date(offerData.deadline) - Date.now()) / 86400000))}d left` : '—'} />
            <StatBox label="Round" value={`#${offerData.history?.length || 1}`} />
          </div>

          {offerData.equity && <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(108,71,255,.08)', border: '1px solid rgba(108,71,255,.2)', fontSize: 12, color: '#a78bfa', marginBottom: 12 }}>🎯 Equity: {offerData.equity} {offerData.startDate && `· Start: ${new Date(offerData.startDate).toLocaleDateString()}`}</div>}

          {/* Hiro prediction */}
          <div style={{ padding: '10px 14px', borderRadius: 'var(--r)', background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.2)', fontSize: 12, color: 'var(--green)', marginBottom: 16 }}>
            ⚡ Hiro: 81% acceptance probability · <span style={{ color: 'var(--text2)' }}>Candidate's expected range: {job?.currency || '£'}{job?.salMin}–{job?.currency || '£'}{job?.salMax}k</span>
          </div>

          {/* Negotiation history timeline */}
          {offerData.history && offerData.history.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="cpanel-section-title">Negotiation history</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {offerData.history.map((entry, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: entry.by === 'employer' ? 'var(--violet)' : 'var(--cyan)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{entry.label}</span>
                        <span style={{ fontSize: 10, color: 'var(--text3)' }}>{new Date(entry.at).toLocaleDateString()}</span>
                      </div>
                      {entry.amount && <div style={{ fontSize: 13, fontWeight: 700, color: entry.by === 'employer' ? '#a78bfa' : 'var(--cyan)' }}>{offerData.currency}{entry.amount}k</div>}
                      {entry.notes && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{entry.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Candidate countered — needs response */}
          {offerData.status === 'countered_by_candidate' && (
            <div style={{ marginBottom: 16, padding: '14px', borderRadius: 8, background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.3)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', marginBottom: 8 }}>⚡ Candidate countered at {offerData.currency}{offerData.latestCounterAmount}k</div>
              {offerData.latestCounterNotes && <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.5 }}>"{offerData.latestCounterNotes}"</div>}
              <div className="field" style={{ marginBottom: 8 }}>
                <label>Your revised offer (000s) — or leave blank to accept as-is</label>
                <input className="inp" type="number" placeholder={`e.g. ${offerData.latestCounterAmount}`} value={counterAmount} onChange={e => setCounterAmount(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 10 }}>
                <label>Message to candidate</label>
                <textarea className="inp" rows={2} placeholder="Explain your position..." value={counterNotes} onChange={e => setCounterNotes(e.target.value)} style={{ resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-violet btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => respondToCounter(true)} disabled={responding}>✓ Accept counter-offer</button>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => respondToCounter(false)} disabled={responding || !counterAmount}>Send revised offer</button>
              </div>
            </div>
          )}

          {/* Mark as accepted manually */}
          {['sent', 'countered_by_employer'].includes(offerData.status) && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>If the candidate verbally accepted or signed outside the platform:</div>
              <button className="btn btn-violet btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={onMoveHired}>✓ Mark as accepted & move to Hired</button>
            </div>
          )}

          {/* Accepted state */}
          {offerData.status === 'accepted' && (
            <div style={{ padding: '14px', borderRadius: 8, background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.3)', marginBottom: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>🎉</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>Offer accepted!</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>Move this candidate to Hired to close out the pipeline.</div>
              <button className="btn btn-violet" onClick={onMoveHired}>Move to Hired →</button>
            </div>
          )}

          {/* Actions footer */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('emp-offer-intel')}>📊 Offer intel</button>
            {!['accepted','withdrawn','declined'].includes(offerData.status) && (
              <button className="btn btn-ghost btn-sm" style={{ color: '#f87171' }} onClick={declineOffer}>Withdraw offer</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Candidate Panel ───────────────────────────────────────────────
function CandPanel({ cand, col, onClose, showToast, navigate, onMoveHired, job, playbook }) {
  const [tab, setTab] = useState('profile');
  const [msgVal, setMsgVal] = useState('');
  const [aiTrajectory, setAiTrajectory] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    if (cand && (cand.work_experience || cand.workExp)) {
      setLoadingAi(true);
      analyzeTrajectory(cand.work_experience || cand.workExp).then(res => { setAiTrajectory(res); setLoadingAi(false); });
    } else { setAiTrajectory(null); }
  }, [cand && cand.id]);

  const d = cand ? {
    name: cand.full_name || cand.name,
    role: cand.job_title || 'Candidate',
    loc: cand.location || 'Remote',
    exp: cand.experience_years ? `${cand.experience_years}yr` : '—',
    salary: cand.salary_expectation ? `${cand.salary_expectation}k` : '—',
    notice: cand.notice_period || '—',
    tags: cand.skills || [],
    email: cand.email,
    linkedin: cand.linkedin,
    workExp: cand.work_experience || cand.workExp || [],
  } : null;

  const [thread, setThread] = useState([{ mine: false, text: `Hi ${d && d.name ? d.name.split(' ')[0] : 'there'}, thanks for your interest in the role. We would love to set up a quick call — are you free this week?` }]);

  if (!cand || !d) return null;

  const sc = scoreCandidateForJob(cand, job);
  const showPb = ['screen', 'r1', 'r2', 'offer'].includes(col);
  const showOffer = col === 'offer';

  function send() { if (!msgVal.trim()) return; setThread(p => [...p, { mine: true, text: msgVal }]); setMsgVal(''); showToast('Message sent', 'success'); }

  const tabs = [
    { key: 'profile', label: 'Overview' },
    { key: 'dna', label: 'DNA' },
    { key: 'exp', label: 'Experience' },
    ...(showPb ? [{ key: 'playbook', label: 'Playbook' }] : []),
    { key: 'message', label: 'Message' },
    ...(showOffer ? [{ key: 'offer', label: 'Offer' }] : []),
  ];

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, width: 560, maxWidth: '95vw', height: '100vh', background: '#0d1020', borderLeft: '1px solid rgba(255,255,255,.1)', zIndex: 600, display: 'flex', flexDirection: 'column', boxShadow: '-16px 0 48px rgba(0,0,0,.5)' }}>
      <div className="cpanel-hdr">
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--violet-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
          {d.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.role} · {d.loc} · {d.exp}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>{sc.overall}%</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>Hiro Fit</div>
        </div>
        <button onClick={onClose} style={{ marginLeft: 10, background: 'none', border: '1px solid var(--border2)', borderRadius: 8, width: 30, height: 30, color: 'var(--text2)', cursor: 'pointer', flexShrink: 0, fontSize: 14 }}>✕</button>
      </div>
      <div className="cpanel-tabs">
        {tabs.map(t => <button key={t.key} className={`cpanel-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>
      <div className="cpanel-body">
        {tab === 'profile' && <>
          <div className="cpanel-section">
            <div className="cpanel-section-title">Overview</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <StatBox label="Salary" value={d.salary} /><StatBox label="Notice" value={d.notice} />
              <StatBox label="DNA fit" value={`${sc.dna}%`} /><StatBox label="Archetype" value={sc.archetype && sc.archetype.name} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{(d.tags || []).map(t => <span key={t} style={{ padding: '2px 8px', borderRadius: 'var(--rp)', background: 'rgba(255,255,255,.07)', fontSize: 11, color: 'var(--text2)' }}>{t}</span>)}</div>
          </div>
          <div className="cpanel-section">
            <div style={{ padding: '10px 13px', borderRadius: 'var(--r)', background: 'rgba(56,189,248,.05)', border: '1px solid rgba(56,189,248,.2)', fontSize: 12, color: 'var(--cyan)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span>AI Trajectory</span>{loadingAi && <span style={{ fontSize: 10, opacity: 0.6 }}>(Analyzing...)</span>}</div>
              <div style={{ lineHeight: 1.5, fontWeight: 500 }}>{loadingAi ? 'Analyzing career progression...' : (aiTrajectory || 'No trajectory data available.')}</div>
            </div>
          </div>
          <div className="cpanel-section">
            <div style={{ padding: '12px 14px', borderRadius: 'var(--r)', background: 'rgba(236,72,153,.05)', border: '1px solid rgba(236,72,153,.2)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#f9a8d4', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>DNA fit insight</div>
              <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.65, margin: 0 }}>{sc.dnaNote}</p>
            </div>
          </div>
          {sc.dnaWarn && <div className="cpanel-section" style={{ marginTop: -10 }}><div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 'var(--r)', background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.25)', fontSize: 12, color: 'var(--amber)' }}><span>⚠</span><span>{sc.dnaWarn}</span></div></div>}
          <div className="cpanel-section">
            <div className="cpanel-section-title">Contact</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 2 }}>{d.email || 'via Hiro messaging'}<br />{d.linkedin || 'Connect via Hiro'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn btn-violet btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setTab('message')}>Message</button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('emp-offer-intel')}>Offer intel</button>
          </div>
        </>}

        {tab === 'dna' && (
          <div className="cpanel-section">
            <div className="cpanel-section-title">DNA breakdown</div>
            {sc.archetype && <div className="dna-archetype" style={{ marginBottom: 14 }}><strong>{sc.archetype.name}</strong> — {sc.archetype.desc}</div>}
            <div style={{ padding: '12px 14px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 10 }}>7 dimensions</div>
              {sc.breakdown && sc.breakdown.map(b => (
                <div key={b.dim} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, width: 18, flexShrink: 0 }}>{b.icon}</span>
                  <span style={{ fontSize: 11, color: 'var(--text2)', width: 116, flexShrink: 0 }}>{b.dim}</span>
                  <div style={{ flex: 1, position: 'relative', height: 5, borderRadius: 999, background: 'rgba(255,255,255,.08)' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${b.candVal}%`, borderRadius: 999, background: 'var(--violet)', opacity: .75 }} />
                    <div style={{ position: 'absolute', top: '50%', left: `${b.jobVal}%`, transform: 'translate(-50%,-50%)', width: 9, height: 9, borderRadius: '50%', background: '#fff', border: '1.5px solid rgba(0,0,0,.5)' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet)', width: 26, textAlign: 'right', flexShrink: 0 }}>{b.fit}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'exp' && (
          <div className="cpanel-section">
            <div className="cpanel-section-title">Experience</div>
            {d.workExp && d.workExp.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {d.workExp.map((w, i) => (
                  <div key={i} style={{ padding: '12px 14px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div><div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{w.role || w.title}</div><div style={{ fontSize: 12, color: 'var(--violet)', fontWeight: 600, marginTop: 1 }}>{w.company || w.co}</div></div>
                      <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0, marginLeft: 12 }}>{w.years || w.period}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.65, margin: '0 0 8px' }}>{w.description || w.desc}</p>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{w.chips && w.chips.map(c => <span key={c.l} className={`chip ${c.c}`} style={{ fontSize: 11 }}>{c.l}</span>)}</div>
                  </div>
                ))}
              </div>
            ) : <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)', fontSize: 13 }}>No experience details provided.</div>}
          </div>
        )}

        {tab === 'playbook' && showPb && (
          <div className="cpanel-section">
            <PlaybookTab cand={cand} col={col} playbook={playbook} jobId={job && job.id} showToast={showToast} />
          </div>
        )}

        {tab === 'message' && (
          <div className="cpanel-section">
            <div className="cpanel-section-title">Message {d.name}</div>
            <div style={{ minHeight: 120, maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {thread.map((m, i) => (
                <div key={i} style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '80%', background: m.mine ? 'rgba(108,71,255,.2)' : 'rgba(255,255,255,.06)', border: `1px solid ${m.mine ? 'rgba(108,71,255,.35)' : 'var(--border2)'}`, borderRadius: m.mine ? '12px 12px 4px 12px' : '12px 12px 12px 4px', padding: '8px 12px', fontSize: 12, color: m.mine ? '#fff' : 'var(--text2)' }}>{m.text}</div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="inp" placeholder="Write a message..." style={{ flex: 1 }} value={msgVal} onChange={e => setMsgVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} />
              <button className="btn btn-violet btn-sm" onClick={send}>Send</button>
            </div>
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Schedule a screen', 'Share prep guide', 'Advance to next stage', 'Follow up'].map(t => (
                <button key={t} className="pc-btn" onClick={() => setMsgVal(t)}>{t}</button>
              ))}
            </div>
          </div>
        )}

        {tab === 'offer' && showOffer && (
          <OfferNegotiationTab
            cand={cand}
            job={job}
            onMoveHired={() => { onMoveHired(); onClose(); showToast(`${d.name} marked as hired 🎉`, 'success'); }}
            navigate={navigate}
            showToast={showToast}
          />
        )}
      </div>
    </div>
  );
}

// ── Main EmpPipeline ──────────────────────────────────────────────
export default function EmpPipeline() {
  const { navigate, showToast } = useApp();
  const { profile } = useAuth();
  const [dbJobs, setDbJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [panelId, setPanelId] = useState(null);
  const [panelCol, setPanelCol] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dragSrc, setDragSrc] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [showPlaybookEditor, setShowPlaybookEditor] = useState(false);
  const [playbook, setPlaybook] = useState(DEFAULT_PLAYBOOK);

  useEffect(() => {
    if (!profile || !profile.id) return;
    const docRef = doc(db, 'playbooks', profile.id);
    getDoc(docRef).then(snap => { if (snap.exists() && snap.data().playbook) setPlaybook(snap.data().playbook); });
  }, [profile && profile.id]);

  async function savePlaybook(newPlaybook) {
    if (!profile || !profile.id) return;
    await setDoc(doc(db, 'playbooks', profile.id), { playbook: newPlaybook, updatedAt: serverTimestamp() }, { merge: true });
    setPlaybook(newPlaybook);
    showToast('Playbook saved', 'success');
  }

  useEffect(() => {
    if (!profile || !profile.id) return;
    const q = query(collection(db, 'jobs'), where('employerId', '==', profile.id));
    return onSnapshot(q, (snapshot) => {
      const jobs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setDbJobs(jobs);
      setSelectedJobId(prev => prev || (jobs[0] && jobs[0].id) || null);
    }, (err) => {
      console.error('EmpPipeline: jobs snapshot error', err);
    });
  }, [profile && profile.id]);

  useEffect(() => {
    if (!profile || !profile.id) return;
    const q = query(collection(db, 'applications'), where('employerId', '==', profile.id));
    return onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setApplications(apps);
    }, (err) => {
      console.error('EmpPipeline: applications snapshot error', err);
      setLoading(false);
    });
  }, [profile && profile.id]);

  useEffect(() => {
    const fetchCandidates = async () => {
      const candIds = [...new Set(applications.map(a => a.candidateId))];
      if (candIds.length === 0) {
        setLoading(false);
        return;
      }

      const cands = [];
      const chunks = [];
      for (let i = 0; i < candIds.length; i += 30) chunks.push(candIds.slice(i, i + 30));
      
      for (const chunk of chunks) {
        try {
          const snap = await getDocs(query(collection(db, 'users'), where('id', 'in', chunk)));
          snap.docs.forEach(d => {
            if (!cands.find(c => c.id === d.id)) {
              cands.push({ id: d.id, ...d.data() });
            }
          });
        } catch (e) {
          console.error("Error fetching candidate chunk:", e);
        }
      }
      setCandidates(cands);
      setLoading(false);
    };

    if (applications.length > 0) {
      fetchCandidates();
    } else {
      // If no applications, we might still be loading or truly have none
      // We set loading false if we have jobs but no apps
      if (dbJobs.length > 0) setLoading(false);
    }
  }, [applications, dbJobs.length]);

  const ACTIVE_JOB = useMemo(() => dbJobs.find(j => j.id === selectedJobId) || dbJobs[0] || null, [dbJobs, selectedJobId]);

  const cols = useMemo(() => {
    const res = { matched: [], screen: [], r1: [], r2: [], offer: [], hired: [] };
    if (!ACTIVE_JOB) return res;
    applications.filter(a => a.jobId === ACTIVE_JOB.id && a.employerExpressedInterest === true).forEach(app => {
      const cand = candidates.find(c => c.id === app.candidateId);
      const stage = (app.stage || 'matched').toLowerCase();
      if (!res[stage]) return;
      const scores = cand ? scoreCandidateForJob(cand, ACTIVE_JOB) : { overall: app.matchScore || 0, dna: app.dnaScore || 0 };
      const isMutual = app.employerExpressedInterest && app.candidateExpressedInterest;
      res[stage].push({
        id: app.candidateId, appId: app.id,
        name: (cand && (cand.full_name || cand.name)) || 'Candidate',
        role: (cand && (cand.job_title || cand.role)) || 'Candidate',
        pill: isMutual ? 'Mutual match' : app.candidateExpressedInterest ? 'Interested' : `Matched ${formatTime(app.updatedAt)}`,
        pBg: isMutual ? 'rgba(34,197,94,.15)' : app.candidateExpressedInterest ? 'rgba(251,113,133,.15)' : 'rgba(108,71,255,.15)',
        pC: isMutual ? 'var(--green)' : app.candidateExpressedInterest ? '#f9a8d4' : '#a78bfa',
        pB: isMutual ? 'rgba(34,197,94,.3)' : app.candidateExpressedInterest ? 'rgba(251,113,133,.3)' : 'rgba(108,71,255,.3)',
        fit: { l: `Fit ${scores.overall}%`, c: scores.overall > 90 ? 'chip-g' : 'chip-v' },
        dna: { l: `DNA ${scores.dna}%`, color: '#f9a8d4' },
        reloc: !!(cand && (cand.relocation || cand.reloc)),
        btns: [{ l: 'Message', p: true }, { l: 'Screen', m: 'screen' }],
      });
    });
    return res;
  }, [applications, candidates, ACTIVE_JOB]);

  function formatTime(ts) {
    if (!ts) return 'recently';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 3600) return 'today';
    if (diff < 86400) return '1d ago';
    return `${Math.floor(diff / 86400)}d ago`;
  }

  async function moveCard(id, from, to, toast) {
    if (!to || from === to || !ACTIVE_JOB) return;
    const app = applications.find(a => a.candidateId === id && a.jobId === ACTIVE_JOB.id);
    const labels = { matched: 'Matched', screen: 'Recruiter Screen', r1: 'Round 1', r2: 'Round 2', offer: 'Offer', hired: 'Hired' };
    try {
      if (app) {
        await updateDoc(doc(db, 'applications', app.id), { stage: to, employerId: profile.id, updatedAt: serverTimestamp() });
      } else {
        const appId = `${id}_${ACTIVE_JOB.id}`;
        await setDoc(doc(db, 'applications', appId), { 
          id: appId,
          candidateId: id, 
          jobId: ACTIVE_JOB.id, 
          employerId: profile.id, 
          stage: to, 
          status: 'matched', 
          employerExpressedInterest: true, 
          createdAt: serverTimestamp(), 
          updatedAt: serverTimestamp() 
        });
      }
      // When a candidate is hired, close the job posting (auto-archives in 30 days)
      if (to === 'hired') {
        await setDoc(doc(db, 'jobs', ACTIVE_JOB.id), { status: 'closed', closedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
        showToast('Candidate hired — job listing closed (auto-archives in 30 days)', 'success');
      } else {
        await addDoc(collection(db, 'notifications'), { userId: id, title: 'Application Update', message: `Your application for ${ACTIVE_JOB.title} has moved to the ${labels[to]} stage.`, type: 'status', route: 'cand-matches', read: false, createdAt: serverTimestamp() });
        showToast(toast || `Moved to ${labels[to]}`, 'success');
      }
    } catch (err) { showToast('Failed to move candidate', 'error'); }
  }

  if (loading && profile && profile.id) {
    return <div className="view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>Loading pipeline...</div>;
  }

  const panelCand = candidates.find(c => c.id === panelId);

  return (
    <div className="view">
      <div className="scroll">
        <div className="page-hdr" style={{ marginBottom: 14 }}>
          <div>
            <div className="eyebrow">Hiring pipeline</div>
            <div className="page-title">Pipeline</div>
            <div className="page-sub">Drag cards to move candidates · Click any card to open profile + interview playbook</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select className="sel" style={{ width: 'auto', minWidth: 200 }} value={selectedJobId || ''} onChange={e => setSelectedJobId(e.target.value)}>
              {dbJobs.length === 0 ? <option value="">No roles posted yet</option> : dbJobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowPlaybookEditor(true)}>Edit playbook</button>
            <button className="btn btn-violet btn-sm" onClick={() => navigate('emp-create-job')}>+ Post role</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, padding: '9px 14px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border2)', marginBottom: 12, fontSize: 12, color: 'var(--text2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--green)', fontWeight: 700 }}>Response health 94%</span>
          <span>·</span><span>Avg time-to-offer <strong style={{ color: '#fff' }}>18 days</strong></span>
          <span>·</span><span style={{ color: 'var(--amber)' }}>3 candidates awaiting first contact</span>
          <button onClick={() => showToast('Refreshed', 'default')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--violet)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Refresh</button>
        </div>

        <div className="card" style={{ padding: 12, overflow: 'hidden' }}>
          <div className="pipe-shell">
            {COLS.map(({ id, label, sub, add, hired: isHired }) => {
              const cards = cols[id] || [];
              return (
                <div key={id} className={`pipe-col${dragOver === id ? ' drag-over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(id); }}
                  onDrop={() => { if (dragId && dragSrc && dragSrc !== id) moveCard(dragId, dragSrc, id); setDragId(null); setDragSrc(null); setDragOver(null); }}
                  onDragLeave={() => setDragOver(null)}
                >
                  <div className="pipe-col-hdr">
                    <div><span className="pipe-col-name">{label}</span><div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{sub}</div></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="pipe-count" style={isHired ? { background: 'rgba(34,197,94,.15)', color: 'var(--green)', borderColor: 'rgba(34,197,94,.3)' } : {}}>{cards.length}</span>
                      {add && <button className="pipe-add-btn" onClick={() => showToast(`Add candidate to ${label}`, 'default')}>+</button>}
                    </div>
                  </div>
                  <div className="drop-zone" />
                  {cards.map(card => (
                    <div key={card.id} className={`pipe-card${(card.age || 0) >= 5 ? ' age-risk' : ''}`}
                      draggable
                      onDragStart={() => { setDragId(card.id); setDragSrc(id); }}
                      onClick={() => { setPanelId(card.id); setPanelCol(id); }}
                    >
                      <div className="pc-stage-pill" style={{ background: card.pBg, color: card.pC, borderColor: card.pB }}>{card.pill}</div>
                      <div className="pc-name">{card.name}</div>
                      <div className="pc-role">{card.role}</div>
                      <div className="pc-foot">
                        <span className={`chip ${card.fit.c}`} style={{ fontSize: 10 }}>{card.fit.l}</span>
                        <span style={{ fontSize: 10, color: card.dna.color }}>{card.dna.l}</span>
                        {card.reloc && <span className="reloc" style={{ fontSize: 10 }}>Reloc</span>}
                      </div>
                      <AgeBadge days={card.age} col={id} />
                      <div className="pc-actions">
                        {card.btns.map((b, i) => (
                          <button key={i} className={`pc-btn${b.p ? ' pc-btn-primary' : ''}`}
                            onClick={e => { e.stopPropagation(); if (b.m) moveCard(card.id, id, b.m); else { setPanelId(card.id); setPanelCol(id); } }}
                          >{b.l}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {panelId && <>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 599 }} onClick={() => setPanelId(null)} />
        <CandPanel
          cand={panelCand}
          job={ACTIVE_JOB}
          col={panelCol}
          playbook={playbook}
          onClose={() => setPanelId(null)}
          showToast={showToast}
          navigate={navigate}
          onMoveHired={() => moveCard(panelId, 'offer', 'hired')}
        />
      </>}

      {showPlaybookEditor && (
        <PlaybookEditorModal
          playbook={playbook}
          onSave={savePlaybook}
          onClose={() => setShowPlaybookEditor(false)}
        />
      )}
    </div>
  );
}
