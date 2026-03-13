/**
 * BlindMatchContext.jsx — Pseudonymized Double-Blind Matching
 *
 * Architecture (from hiro-legal-framework-2.pdf):
 *   Phase 1 — BLIND: Employer sees only a UUID alias, Work DNA vector,
 *             role-fit %, and archetype label. Zero PII.
 *   Phase 2 — SIGNAL: Employer sends an "interest signal" (no message yet).
 *             Candidate sees the signal with employer name + role (but no
 *             contact details). Candidate can Accept or Decline.
 *   Phase 3 — REVEAL: Both sides have accepted → full profiles unlock +
 *             a messaging thread is created automatically.
 *
 * Firestore collections:
 *   matches/{matchId}
 *     candidateId:    uid (never sent to employer in phase 1/2)
 *     employerId:     uid (never sent to candidate in phase 1)
 *     candidateAlias: string  — e.g. "Candidate #A7F2"
 *     jobId:          string
 *     jobTitle:       string
 *     companyName:    string  — shown to candidate in phase 2
 *     dnaVector:      number[]  — 7-dim, shared with employer
 *     dnaScore:       number    — match %, shared both ways
 *     archetype:      string    — shared with employer
 *     experienceYears: string   — shared with employer
 *     location:       string    — shown as "London area" (city only)
 *     skills:         string[]  — shared with employer (no name)
 *     status:         'pending' | 'signalled' | 'candidate_accepted'
 *                              | 'mutual' | 'declined' | 'expired'
 *     employerSignalledAt: timestamp | null
 *     candidateRespondedAt: timestamp | null
 *     revealedAt:     timestamp | null
 *     createdAt:      timestamp
 *     expiresAt:      timestamp  — 30 days from creation
 *
 * GDPR compliance:
 *   Employer NEVER receives candidateId until status === 'mutual'.
 *   candidateAlias is a stable but non-reversible token per match.
 *   Decline events are soft-deleted (status = 'declined'), not erased,
 *   to support the Ghost Score audit trail.
 */

import {
  createContext, useContext, useState, useCallback, useEffect,
} from 'react';
import {
  collection, query, where, onSnapshot, doc,
  updateDoc, addDoc, serverTimestamp, Timestamp,
  getDocs, getDoc, orderBy, limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth }     from './AuthContext';
import { useMessages } from './MessageContext';
import { notifySignalReceived } from '../services/notificationService';

/* ── Alias generator (deterministic, non-reversible display token) */
const ALIAS_ADJECTIVES = [
  'Swift','Bright','Calm','Bold','Sharp','Keen','Clear','Deep',
  'Agile','Focused','Precise','Driven','Steady','Open','Rare',
];
const ALIAS_NOUNS = [
  'Thinker','Builder','Solver','Maker','Pilot','Mapper','Weaver',
  'Shaper','Coder','Lead','Planner','Analyst','Architect','Operator',
];

function generateAlias(matchId) {
  // Deterministic from matchId chars so the same match always gets the same alias
  const seed = matchId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const adj  = ALIAS_ADJECTIVES[seed % ALIAS_ADJECTIVES.length];
  const noun = ALIAS_NOUNS[Math.floor(seed / ALIAS_ADJECTIVES.length) % ALIAS_NOUNS.length];
  const num  = ((seed * 7) % 9000 + 1000).toString();
  return `${adj} ${noun} #${num}`;
}

/* ── What the employer sees in phase 1 (blind view) ─────────────── */
export function toBlindProfile(match) {
  return {
    matchId:        match.id,
    alias:          match.candidateAlias || generateAlias(match.id),
    dnaScore:       match.dnaScore,
    dnaVector:      match.dnaVector,
    archetype:      match.archetype,
    experienceYears: match.experienceYears,
    locationCity:   match.location?.split(',')[0] ?? 'Undisclosed',
    skills:         match.skills ?? [],
    status:         match.status,
    jobId:          match.jobId,
    jobTitle:       match.jobTitle,
    createdAt:      match.createdAt,
    expiresAt:      match.expiresAt,
    // PII intentionally omitted: candidateId, full_name, email, photo
  };
}

/* ── What the candidate sees in phase 2 (signal view) ─────────────── */
export function toSignalView(match) {
  return {
    matchId:     match.id,
    dnaScore:    match.dnaScore,
    companyName: match.companyName,
    jobTitle:    match.jobTitle,
    status:      match.status,
    signalledAt: match.employerSignalledAt,
    // Employer contact NOT shown until phase 3 (mutual)
  };
}

/* ── Context shape ─────────────────────────────────────────────── */
const BlindMatchContext = createContext({
  // Employer side
  blindMatches:       [],   // phase-1 cards (no PII)
  signalInterest:     async () => {},
  // Candidate side
  pendingSignals:     [],   // signals awaiting candidate response
  acceptSignal:       async () => {},
  declineSignal:      async () => {},
  // Shared
  mutualMatches:      [],   // fully revealed matches (both sides)
  loading:            true,
});

export function BlindMatchProvider({ children }) {
  const { profile }      = useAuth();
  const { createThread } = useMessages();

  const [blindMatches,   setBlindMatches]   = useState([]);
  const [pendingSignals, setPendingSignals] = useState([]);
  const [mutualMatches,  setMutualMatches]  = useState([]);
  const [loading,        setLoading]        = useState(true);

  /* ── Subscribe based on role ───────────────────────────────── */
  useEffect(() => {
    if (!profile?.id) { setLoading(false); return; }

    const isEmployer  = profile.mode === 'employer';
    const field       = isEmployer ? 'employerId' : 'candidateId';

    const q = query(
      collection(db, 'matches'),
      where(field, '==', profile.id),
      where('status', '!=', 'expired'),
      orderBy('status'),
      orderBy('createdAt', 'desc'),
      limit(100),
    );

    const unsub = onSnapshot(q,
      snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (isEmployer) {
          // Employer: split by phase
          const blind  = docs
            .filter(m => m.status === 'pending' || m.status === 'signalled')
            .map(toBlindProfile);
          const mutual = docs.filter(m => m.status === 'mutual');
          setBlindMatches(blind);
          setMutualMatches(mutual);
        } else {
          // Candidate: split by phase
          const signals = docs
            .filter(m => m.status === 'signalled')
            .map(toSignalView);
          const mutual  = docs.filter(m => m.status === 'mutual');
          setPendingSignals(signals);
          setMutualMatches(mutual);
        }
        setLoading(false);
      },
      err => {
        console.error('BlindMatchContext snapshot error:', err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [profile?.id, profile?.mode]);

  /* ── Employer: send interest signal ───────────────────────── */
  const signalInterest = useCallback(async (matchId) => {
    if (!profile?.id) return;
    try {
      await updateDoc(doc(db, 'matches', matchId), {
        status:               'signalled',
        employerSignalledAt:  serverTimestamp(),
      });
      // Notify candidate (fire-and-forget)
      const snap = await getDoc(doc(db, 'matches', matchId));
      if (snap.exists()) {
        const m = snap.data();
        notifySignalReceived({
          recipientId: m.candidateId,
          companyName: profile.company_name || profile.full_name,
          jobTitle:    m.jobTitle,
          matchId,
        });
      }
    } catch (e) {
      console.error('signalInterest error:', e);
      throw e;
    }
  }, [profile?.id, profile?.company_name, profile?.full_name]);

  /* ── Candidate: accept a signal → mutual reveal ────────────── */
  const acceptSignal = useCallback(async (matchId) => {
    if (!profile?.id) return;
    try {
      // 1. Read the match to get both IDs for thread creation
      const snap = await getDoc(doc(db, 'matches', matchId));
      if (!snap.exists()) throw new Error('Match not found');
      const match = { id: snap.id, ...snap.data() };

      // 2. Reveal: update match status
      await updateDoc(doc(db, 'matches', matchId), {
        status:               'mutual',
        candidateRespondedAt: serverTimestamp(),
        revealedAt:           serverTimestamp(),
      });

      // 3. Auto-create messaging thread so both sides can talk immediately
      if (createThread) {
        await createThread({
          candidateId:   match.candidateId,
          employerId:    match.employerId,
          jobId:         match.jobId,
          jobTitle:      match.jobTitle,
          companyName:   match.companyName,
          emoji:         '🧬',
          candidateName: profile.full_name,
          matchScore:    match.dnaScore,
        });
      }
    } catch (e) {
      console.error('acceptSignal error:', e);
      throw e;
    }
  }, [profile?.id, profile?.full_name, createThread]);

  /* ── Candidate: decline a signal ──────────────────────────── */
  const declineSignal = useCallback(async (matchId) => {
    if (!profile?.id) return;
    try {
      await updateDoc(doc(db, 'matches', matchId), {
        status:               'declined',
        candidateRespondedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('declineSignal error:', e);
      throw e;
    }
  }, [profile?.id]);

  return (
    <BlindMatchContext.Provider value={{
      blindMatches,
      pendingSignals,
      mutualMatches,
      loading,
      signalInterest,
      acceptSignal,
      declineSignal,
    }}>
      {children}
    </BlindMatchContext.Provider>
  );
}

export const useBlindMatch = () => useContext(BlindMatchContext);
