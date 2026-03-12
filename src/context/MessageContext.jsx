import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp, getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const MessageContext = createContext({
  threads: {},
  unreadCount: 0,
  markAsRead: () => {},
  sendMessage: async () => {},
});

// ── Fallback demo threads shown when Firestore has no data ─────────
const DEMO_THREADS = {
  monzo: {
    id: 'monzo', emoji: '🏦', name: 'Monzo · Sarah', role: 'Sr PM · 🧬 91%',
    preview: 'Hi! We loved your profile — your Work DNA is a near-perfect fit.',
    time: '2h', unread: true, status: '● Online · Verified employer · Mutual match 🧬 91%', statusColor: 'var(--green)',
    ctaLabel: 'View company →', ctaRoute: 'cand-company', isDemo: true,
    messages: [
      { id: 'd1', from: 'them', avatar: '🏦', text: 'Hi! 👋 We loved your profile — your Work DNA fills exactly the gap we have. Free Thursday or Friday?', time: 'Sarah · 2 hours ago' },
      { id: 'd2', from: 'me', text: 'Thursday 2–5pm GMT works perfectly. Really excited about this one.', time: 'You · 1 hour ago' },
      { id: 'd3', from: 'them', avatar: '🏦', text: 'Perfect! Calendar invite sent for Thu 3pm GMT. Casual chat — no formal prep needed.', time: 'Sarah · 45 min ago' },
      { id: 'd4', type: 'event', text: '📅 Interview scheduled — Thu 3pm GMT', color: 'var(--green)', bg: 'rgba(34,197,94,.07)', border: 'rgba(34,197,94,.2)' },
    ],
  },
  synthesia: {
    id: 'synthesia', emoji: '🧠', name: 'Synthesia · Hiring', role: 'PM AI Products · 🧬 83%',
    preview: 'Congrats on the mutual match! 🎉',
    time: '1d', unread: true, status: '● Active · Verified employer · Mutual match 🧬 83%', statusColor: 'var(--green)',
    ctaLabel: 'View match →', ctaRoute: 'cand-matches', isDemo: true,
    messages: [
      { id: 'd5', from: 'them', avatar: '🧠', text: 'Hey! 🎉 Congrats on the mutual match — we were impressed by your Work DNA and fintech background. Open to a quick 20-min intro call?', time: 'Synthesia Hiring · 1 day ago' },
      { id: 'd6', type: 'note', text: '🧬 DNA note: one flag on feedback style — worth discussing early', color: 'var(--text3)', bg: 'rgba(108,71,255,.07)', border: 'rgba(108,71,255,.15)' },
    ],
  },
};

export function MessageProvider({ children }) {
  const { profile } = useAuth();
  const [firestoreThreads, setFirestoreThreads] = useState(null); // null = not yet loaded
  const [localMsgs, setLocalMsgs] = useState({}); // threadId → extra messages sent this session

  // ── Load threads from Firestore ─────────────────────────────────
  useEffect(() => {
    if (!profile?.id) { setFirestoreThreads(null); return; }

    const q = query(
      collection(db, 'threads'),
      where('participants', 'array-contains', profile.id),
      orderBy('updatedAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = {};
      snap.docs.forEach(d => {
        const t = { id: d.id, ...d.data() };
        data[d.id] = t;
      });
      setFirestoreThreads(data);
    }, (err) => {
      console.error('MessageContext: threads snapshot error', err);
      setFirestoreThreads({}); // treat as empty, fall through to demo
    });

    return () => unsub();
  }, [profile?.id]);

  // ── Decide which threads to show ─────────────────────────────────
  // If Firestore returned threads, use those. Otherwise show demo data.
  const threads = useMemo(() => {
    if (firestoreThreads === null) return DEMO_THREADS; // still loading
    if (Object.keys(firestoreThreads).length > 0) {
      // Merge any optimistically sent messages
      const merged = { ...firestoreThreads };
      Object.entries(localMsgs).forEach(([tid, msgs]) => {
        if (merged[tid]) merged[tid] = { ...merged[tid], messages: [...(merged[tid].messages || []), ...msgs] };
      });
      return merged;
    }
    // No real threads — show demo
    const demo = { ...DEMO_THREADS };
    Object.entries(localMsgs).forEach(([tid, msgs]) => {
      if (demo[tid]) demo[tid] = { ...demo[tid], messages: [...demo[tid].messages, ...msgs] };
    });
    return demo;
  }, [firestoreThreads, localMsgs]);

  const unreadCount = useMemo(() =>
    Object.values(threads).filter(t => t.unread).length,
  [threads]);

  // ── markAsRead ──────────────────────────────────────────────────
  const markAsRead = useCallback(async (threadId) => {
    const thread = threads[threadId];
    if (!thread || !thread.unread) return;

    // Optimistic local update for demo threads
    if (thread.isDemo) {
      setLocalMsgs(p => p); // trigger re-render via threads memo
      // Patch demo thread directly
      DEMO_THREADS[threadId] && (DEMO_THREADS[threadId].unread = false);
      return;
    }
    // Real Firestore thread
    try {
      await updateDoc(doc(db, 'threads', threadId), { unread: false });
    } catch (e) {
      console.error('markAsRead failed', e);
    }
  }, [threads]);

  // ── sendMessage ─────────────────────────────────────────────────
  const sendMessage = useCallback(async (threadId, text) => {
    const thread = threads[threadId];
    if (!thread) return;

    const newMsg = { id: `local-${Date.now()}`, from: 'me', text, time: 'You · just now' };

    // Always optimistically add to local state immediately
    setLocalMsgs(prev => ({
      ...prev,
      [threadId]: [...(prev[threadId] || []), newMsg],
    }));

    if (thread.isDemo || !profile?.id) return; // demo mode — no Firestore write

    // Write to Firestore
    try {
      await addDoc(collection(db, 'threads', threadId, 'messages'), {
        from: profile.id,
        text,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'threads', threadId), {
        preview: text,
        updatedAt: serverTimestamp(),
        unread: false,
      });
    } catch (e) {
      console.error('sendMessage failed', e);
    }
  }, [threads, profile?.id]);

  return (
    <MessageContext.Provider value={{ threads, unreadCount, markAsRead, sendMessage }}>
      {children}
    </MessageContext.Provider>
  );
}

export const useMessages = () => useContext(MessageContext);
