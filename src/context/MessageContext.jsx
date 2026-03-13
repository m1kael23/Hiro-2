/**
 * MessageContext v2 — Real-time Firestore messaging
 *
 * Firestore shape:
 *   threads/{id}
 *     participants: [uid, uid]
 *     unreadBy:    { [uid]: bool }
 *     typing:      { [uid]: bool }
 *     preview:     string
 *     emoji:       string
 *     name:        string          ← display name for candidate (shows company name)
 *     jobTitle:    string
 *     matchScore:  number
 *     updatedAt:   timestamp
 *
 *   threads/{id}/messages/{msgId}
 *     senderId:  uid
 *     text:      string
 *     type:      'text' | 'event' | 'note'
 *     createdAt: timestamp
 *     — event/note extra fields: color, bg, border
 */

import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, setDoc, doc, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const MessageContext = createContext({
  threads:        {},
  activeMessages: [],
  unreadCount:    0,
  activeThreadId: null,
  loadThread:     async () => {},
  sendMessage:    async () => {},
  markAsRead:     async () => {},
  createThread:   async () => null,
  setTyping:      () => {},
  partnerTyping:  {},
});

/* ─── Demo threads (fallback when user has no Firestore threads) ── */
const DEMO_THREADS = {
  monzo: {
    id: 'monzo', emoji: '🏦', name: 'Monzo · Sarah', jobTitle: 'Sr PM',
    matchScore: 91, preview: 'Hi! We loved your profile — your Work DNA is a near-perfect fit.',
    time: '2h', unread: true,
    status: '● Online · Verified employer · Mutual match 🧬 91%', statusColor: 'var(--green)',
    ctaLabel: 'View company →', ctaRoute: 'cand-company', isDemo: true,
    participants: [], unreadBy: {},
  },
  synthesia: {
    id: 'synthesia', emoji: '🧠', name: 'Synthesia · Hiring', jobTitle: 'PM AI Products',
    matchScore: 83, preview: 'Congrats on the mutual match! 🎉',
    time: '1d', unread: true,
    status: '● Active · Verified employer · Mutual match 🧬 83%', statusColor: 'var(--green)',
    ctaLabel: 'View match →', ctaRoute: 'cand-matches', isDemo: true,
    participants: [], unreadBy: {},
  },
};

const DEMO_MESSAGES = {
  monzo: [
    { id: 'd1', from: 'them', senderId: 'monzo',  avatar: '🏦', text: 'Hi! 👋 We loved your profile — your Work DNA fills exactly the gap we have. Free Thursday or Friday?', time: 'Sarah · 2h ago' },
    { id: 'd2', from: 'me',   senderId: 'me',               text: 'Thursday 2–5pm GMT works perfectly. Really excited about this one.', time: 'You · 1h ago' },
    { id: 'd3', from: 'them', senderId: 'monzo',  avatar: '🏦', text: 'Perfect! Calendar invite sent for Thu 3pm GMT. Casual chat — no formal prep needed.', time: 'Sarah · 45m ago' },
    { id: 'd4', type: 'event', text: '📅 Interview scheduled — Thu 3pm GMT', color: 'var(--green)', bg: 'rgba(34,197,94,.07)', border: 'rgba(34,197,94,.2)' },
  ],
  synthesia: [
    { id: 'd5', from: 'them', senderId: 'synthesia', avatar: '🧠', text: 'Hey! 🎉 Congrats on the mutual match. Open to a quick 20-min intro call?', time: 'Synthesia Hiring · 1d ago' },
    { id: 'd6', type: 'note', text: '🧬 DNA note: one flag on feedback style — worth discussing early', color: 'var(--text3)', bg: 'rgba(108,71,255,.07)', border: 'rgba(108,71,255,.15)' },
  ],
};

/* ══════════════════════════════════════════════════════════════════
   PROVIDER
══════════════════════════════════════════════════════════════════ */
export function MessageProvider({ children }) {
  const { profile } = useAuth();

  const [firestoreThreads, setFirestoreThreads] = useState(null); // null = still loading
  const [activeMessages,   setActiveMessages]   = useState([]);
  const [activeThreadId,   setActiveThreadId]   = useState(null);
  const [partnerTyping,    setPartnerTyping]     = useState({});

  const msgUnsubRef     = useRef(null);
  const typingUnsubRef  = useRef(null);
  const typingTimerRef  = useRef(null);

  /* ── 1. Subscribe to this user's thread list ──────────────────── */
  useEffect(() => {
    if (!profile?.id) { setFirestoreThreads(null); return; }

    const q = query(
      collection(db, 'threads'),
      where('participants', 'array-contains', profile.id),
      orderBy('updatedAt', 'desc'),
    );

    const unsub = onSnapshot(q,
      snap => {
        const map = {};
        snap.docs.forEach(d => { map[d.id] = { id: d.id, ...d.data(), messages: [] }; });
        setFirestoreThreads(map);
      },
      err => {
        console.error('MessageContext thread list error:', err);
        setFirestoreThreads({});            // fall through to demo
      },
    );
    return () => unsub();
  }, [profile?.id]);

  /* ── 2. Load messages for active thread ───────────────────────── */
  const loadThread = useCallback((threadId) => {
    if (!threadId) return;

    // Tear down previous subscriptions
    if (msgUnsubRef.current)    { msgUnsubRef.current();    msgUnsubRef.current    = null; }
    if (typingUnsubRef.current) { typingUnsubRef.current(); typingUnsubRef.current = null; }

    setActiveThreadId(threadId);
    setPartnerTyping(p => ({ ...p, [threadId]: false }));

    // Demo thread — use static messages, no Firestore sub needed
    if (DEMO_THREADS[threadId]) {
      setActiveMessages(DEMO_MESSAGES[threadId] || []);
      return;
    }

    // Real thread — subscribe to messages sub-collection
    const msgQ = query(
      collection(db, 'threads', threadId, 'messages'),
      orderBy('createdAt', 'asc'),
    );

    msgUnsubRef.current = onSnapshot(msgQ,
      snap => {
        const msgs = snap.docs.map(d => {
          const data = d.data();
          const isMe = data.senderId === profile?.id;
          return {
            id:       d.id,
            from:     isMe ? 'me' : 'them',
            senderId: data.senderId,
            text:     data.text,
            type:     data.type || 'text',
            avatar:   data.avatar,
            color:    data.color,
            bg:       data.bg,
            border:   data.border,
            time:     data.createdAt?.toDate
              ? data.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'now',
          };
        });
        setActiveMessages(msgs);
      },
      err => console.error('MessageContext messages sub error:', err),
    );

    // Subscribe to typing field on thread doc
    typingUnsubRef.current = onSnapshot(doc(db, 'threads', threadId),
      snap => {
        const typing = snap.data()?.typing || {};
        const othersTyping = Object.entries(typing).some(
          ([uid, val]) => uid !== profile?.id && val === true,
        );
        setPartnerTyping(p => ({ ...p, [threadId]: othersTyping }));
      },
      () => {},
    );
  }, [profile?.id]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (msgUnsubRef.current)    msgUnsubRef.current();
    if (typingUnsubRef.current) typingUnsubRef.current();
  }, []);

  /* ── 3. Typing indicator ──────────────────────────────────────── */
  const setTyping = useCallback(async (threadId, isTyping) => {
    if (!profile?.id || !threadId || DEMO_THREADS[threadId]) return;
    try {
      await updateDoc(doc(db, 'threads', threadId), {
        [`typing.${profile.id}`]: isTyping,
      });
    } catch (e) { /* non-critical */ }
  }, [profile?.id]);

  /* ── 4. Send a message ────────────────────────────────────────── */
  const sendMessage = useCallback(async (threadId, text) => {
    if (!text?.trim()) return;

    // Demo thread — optimistic only, no Firestore write
    if (DEMO_THREADS[threadId]) {
      setActiveMessages(p => [...p, {
        id: `local-${Date.now()}`, from: 'me', senderId: 'me',
        text: text.trim(), time: 'just now',
      }]);
      return;
    }

    if (!profile?.id) return;

    // Optimistic update
    setActiveMessages(p => [...p, {
      id: `opt-${Date.now()}`, from: 'me', senderId: profile.id,
      text: text.trim(), time: 'now',
    }]);

    try {
      await Promise.all([
        addDoc(collection(db, 'threads', threadId, 'messages'), {
          senderId:  profile.id,
          text:      text.trim(),
          createdAt: serverTimestamp(),
        }),
        updateDoc(doc(db, 'threads', threadId), {
          preview:   text.trim().slice(0, 80),
          updatedAt: serverTimestamp(),
          [`unreadBy.${profile.id}`]: false,
        }),
        setTyping(threadId, false),
      ]);
    } catch (e) {
      console.error('sendMessage error:', e);
    }
  }, [profile?.id, setTyping]);

  /* ── 5. Mark thread as read ───────────────────────────────────── */
  const markAsRead = useCallback(async (threadId) => {
    if (!profile?.id || !threadId || DEMO_THREADS[threadId]) return;
    try {
      await updateDoc(doc(db, 'threads', threadId), {
        [`unreadBy.${profile.id}`]: false,
      });
    } catch (e) { /* non-critical */ }
  }, [profile?.id]);

  /* ── 6. Create a new thread between two users ─────────────────── */
  const createThread = useCallback(async ({
    candidateId, employerId, jobId, jobTitle,
    companyName, emoji, candidateName, matchScore,
  }) => {
    if (!profile?.id) return null;

    // Check for existing thread on same job pair
    try {
      const existing = await getDocs(query(
        collection(db, 'threads'),
        where('participants', 'array-contains', candidateId),
        where('jobId', '==', jobId),
      ));
      const found = existing.docs.find(d =>
        d.data().participants.includes(employerId),
      );
      if (found) return found.id;
    } catch (e) { /* proceed to create */ }

    const ref = await addDoc(collection(db, 'threads'), {
      participants:  [candidateId, employerId],
      jobId:         jobId         || '',
      jobTitle:      jobTitle      || '',
      companyName:   companyName   || '',
      emoji:         emoji         || '💬',
      candidateName: candidateName || '',
      matchScore:    matchScore    || null,
      name:          companyName   || '',      // candidate sees company name
      preview:       '',
      unreadBy:      { [candidateId]: true, [employerId]: false },
      typing:        {},
      createdAt:     serverTimestamp(),
      updatedAt:     serverTimestamp(),
    });
    return ref.id;
  }, [profile?.id]);

  /* ── Derived: threads visible to UI ──────────────────────────── */
  const threads = useMemo(() => {
    if (firestoreThreads === null)              return DEMO_THREADS; // still loading
    if (Object.keys(firestoreThreads).length)  return firestoreThreads;
    return DEMO_THREADS;                                             // empty → show demo
  }, [firestoreThreads]);

  /* ── Derived: unread count ────────────────────────────────────── */
  const unreadCount = useMemo(() =>
    Object.values(threads).filter(t => {
      if (t.unread) return true;
      if (t.unreadBy && profile?.id) return t.unreadBy[profile.id] === true;
      return false;
    }).length,
  [threads, profile?.id]);

  return (
    <MessageContext.Provider value={{
      threads, activeMessages, unreadCount, activeThreadId,
      loadThread, sendMessage, markAsRead, createThread,
      setTyping, partnerTyping,
    }}>
      {children}
    </MessageContext.Provider>
  );
}

export const useMessages = () => useContext(MessageContext);
