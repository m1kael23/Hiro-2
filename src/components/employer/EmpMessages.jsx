import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp }      from '../../context/AppContext';
import { useAuth }     from '../../context/AuthContext';
import { useMessages } from '../../context/MessageContext';

/* ─── Bubble (mirrors CandMessages) ─────────────────────────────── */
function Bubble({ msg, myInitials }) {
  if (msg.type === 'event' || msg.type === 'note') {
    return (
      <div style={{
        textAlign: 'center', padding: '8px 14px', margin: '4px auto', maxWidth: '80%',
        background: msg.bg     || 'rgba(108,71,255,.08)',
        border:    `1px solid ${msg.border || 'rgba(108,71,255,.2)'}`,
        borderRadius: 'var(--r)', fontSize: 12,
        color:     msg.color   || 'var(--text3)',
        fontWeight: msg.type === 'event' ? 600 : 400,
      }}>{msg.text}</div>
    );
  }
  const isMe = msg.from === 'me';
  return (
    <div style={{
      display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row',
      gap: 9, maxWidth: '76%', alignSelf: isMe ? 'flex-end' : 'flex-start',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
        background:  isMe ? 'linear-gradient(135deg,#6c47ff,#4f35cc)' : 'rgba(20,24,50,.9)',
        border:      isMe ? 'none' : '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: isMe ? 11 : 14, fontWeight: 700, color: '#fff',
      }}>
        {isMe ? myInitials : (msg.avatar || '👤')}
      </div>
      <div>
        <div style={{
          borderRadius:  isMe ? '12px 0 12px 12px' : '0 12px 12px 12px',
          padding: '10px 13px', fontSize: 14, lineHeight: 1.6,
          background: isMe ? 'var(--violet-grad,linear-gradient(135deg,#6c47ff,#4f35cc))' : 'var(--surface2,rgba(255,255,255,.07))',
          color: isMe ? '#fff' : 'var(--text)',
        }}>{msg.text}</div>
        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, textAlign: isMe ? 'right' : 'left', padding: isMe ? '0 2px 0 0' : '0 0 0 2px' }}>
          {msg.time}
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, maxWidth: '76%' }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(20,24,50,.9)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>…</div>
      <div style={{ background: 'var(--surface2,rgba(255,255,255,.07))', borderRadius: '0 12px 12px 12px', padding: '12px 16px', display: 'flex', gap: 4 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text3)', animation: 'dotBounce .9s ease infinite', animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════════ */
export default function EmpMessages({ initialThreadId } = {}) {
  const { navigate }   = useApp();
  const { profile }    = useAuth();
  const {
    threads, activeMessages, unreadCount, activeThreadId,
    loadThread, sendMessage, markAsRead, setTyping, partnerTyping,
  } = useMessages();

  const [input,      setInput]      = useState('');
  const [searchQ,    setSearchQ]    = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const bottomRef   = useRef(null);
  const typingTimer = useRef(null);

  const threadList = Object.values(threads);
  const firstId    = threadList[0]?.id || null;

  useEffect(() => {
    const target = initialThreadId || firstId;
    if (target && target !== activeThreadId) loadThread(target);
  }, [firstId, initialThreadId]); // eslint-disable-line

  useEffect(() => { if (activeThreadId) markAsRead(activeThreadId); }, [activeThreadId, markAsRead]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeMessages]);

  const handleInput = useCallback((val) => {
    setInput(val);
    if (!activeThreadId) return;
    setTyping(activeThreadId, true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(activeThreadId, false), 1500);
  }, [activeThreadId, setTyping]);

  async function handleSend() {
    const text = input.trim();
    if (!text || !activeThreadId) return;
    setInput('');
    clearTimeout(typingTimer.current);
    setTyping(activeThreadId, false);
    await sendMessage(activeThreadId, text);
  }

  const activeThread = threads[activeThreadId] || null;
  const myInitials   = (profile?.full_name || profile?.company_name || 'Me')
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const isTyping     = partnerTyping[activeThreadId] || false;

  const filteredList = searchQ
    ? threadList.filter(t =>
        (t.candidateName || t.name || '').toLowerCase().includes(searchQ.toLowerCase()) ||
        (t.jobTitle || '').toLowerCase().includes(searchQ.toLowerCase()) ||
        (t.preview  || '').toLowerCase().includes(searchQ.toLowerCase()))
    : threadList;

  /* ── empty state ────────────────────────────────────────────────── */
  if (threadList.length === 0) {
    return (
      <div className="view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: 'var(--text3)' }}>
        <span style={{ fontSize: 48 }}>💬</span>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>No conversations yet</div>
        <div style={{ fontSize: 14, maxWidth: 300, textAlign: 'center' }}>
          Start a conversation from Candidates when you express interest in someone.
        </div>
        <button className="btn btn-violet" onClick={() => navigate('emp-candidates')}>Go to Candidates →</button>
      </div>
    );
  }

  return (
    <div className="view" style={{ flexDirection: 'row', overflow: 'hidden' }}>

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            Messages
            {unreadCount > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>{unreadCount} unread</span>}
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text3)', padding: 0 }} onClick={() => setShowSearch(s => !s)}>🔍</button>
        </div>

        {showSearch && (
          <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            <input className="inp" style={{ width: '100%' }} placeholder="Search by candidate or role…"
              value={searchQ} onChange={e => setSearchQ(e.target.value)} autoFocus />
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin' }}>
          {filteredList.map(t => {
            const isActive  = t.id === activeThreadId;
            const isUnread  = t.unread || (t.unreadBy?.[profile?.id]) || false;
            const label     = t.candidateName || t.name || 'Candidate';
            const timeLabel = t.updatedAt?.toDate
              ? t.updatedAt.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' })
              : (t.time || '');
            return (
              <div key={t.id} onClick={() => loadThread(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', cursor: 'pointer',
                  background:  isActive ? 'rgba(108,71,255,.12)' : 'transparent',
                  borderLeft:  isActive ? '2px solid var(--violet)' : '2px solid transparent',
                  transition: 'background .15s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,.03)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Candidate initials avatar */}
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(108,71,255,.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: 'var(--violet)',
                }}>
                  {label.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: isUnread ? 700 : 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0, marginLeft: 6 }}>{timeLabel}</div>
                  </div>
                  {t.jobTitle && (
                    <div style={{ fontSize: 10, color: 'var(--cyan)', marginBottom: 2 }}>
                      {t.jobTitle}{t.matchScore ? ` · 🧬 ${t.matchScore}%` : ''}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.preview || 'No messages yet'}
                  </div>
                </div>
                {isUnread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--violet)', flexShrink: 0 }} />}
              </div>
            );
          })}
          {filteredList.length === 0 && (
            <div style={{ padding: '20px 14px', fontSize: 13, color: 'var(--text3)', textAlign: 'center' }}>No results</div>
          )}
        </div>
      </div>

      {/* ── Conversation ─────────────────────────────────────────────── */}
      {!activeThread ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 36 }}>💬</span>
          <div style={{ fontSize: 14 }}>Select a conversation</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'rgba(108,71,255,.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: 'var(--violet)',
            }}>
              {(activeThread.candidateName || activeThread.name || 'C').slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {activeThread.candidateName || activeThread.name || 'Candidate'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                {activeThread.jobTitle ? `Re: ${activeThread.jobTitle}` : 'Hiro conversation'}
                {activeThread.matchScore && (
                  <span style={{ marginLeft: 8, color: 'var(--violet)', fontWeight: 700 }}>🧬 {activeThread.matchScore}%</span>
                )}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('emp-pipeline')}>Pipeline →</button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('emp-candidates')}>Candidates →</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, scrollbarWidth: 'thin' }}>
            {activeMessages.map((msg, i) => (
              <Bubble key={msg.id || i} msg={msg} myInitials={myInitials} />
            ))}
            {isTyping && <TypingDots />}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 8, flexShrink: 0 }}>
            <input
              className="inp"
              placeholder={`Message ${activeThread.candidateName || 'candidate'}…`}
              style={{ flex: 1 }}
              value={input}
              onChange={e => handleInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <button className="btn btn-violet btn-sm" onClick={handleSend} disabled={!input.trim()}>Send →</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: .4; }
          40%            { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
