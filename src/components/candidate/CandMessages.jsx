import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useMessages } from '../../context/MessageContext';

export default function CandMessages() {
  const { navigate } = useApp();
  const { threads, unreadCount, markAsRead, sendMessage } = useMessages();
  const [active, setActive] = useState('monzo');
  const [inputs, setInputs] = useState({ monzo: '', synthesia: '', revolut: '' });
  const threadRef = useRef(null);

  // Mark active thread as read
  useEffect(() => {
    markAsRead(active);
  }, [active, markAsRead]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [active, threads]);

  function handleSend(threadId) {
    const text = inputs[threadId]?.trim();
    if (!text) return;
    sendMessage(threadId, text);
    setInputs(prev => ({ ...prev, [threadId]: '' }));
  }

  const thread = threads[active];
  const msgs = thread.messages;

  return (
    <div className="view" style={{ flexDirection: 'row', overflow: 'hidden' }}>
      {/* Thread list */}
      <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: 14, borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Messages <span style={{ color: 'var(--text3)', fontWeight: 400 }}>{unreadCount > 0 ? `${unreadCount} unread` : 'All read'}</span></div>
          <span style={{ fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>🔍</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin' }}>
          {Object.values(threads).map(t => (
            <div key={t.id} className={`msg-thread-item${active === t.id ? ' active' : ''}${t.unread ? ' unread' : ''}`}
              onClick={() => setActive(t.id)}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(20,24,50,.9)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{t.emoji}</div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <div className="msg-thread-name">{t.name}</div>
                  <div className="msg-thread-time">{t.time}</div>
                </div>
                <div style={{ fontSize: 10, color: '#2dd4bf', marginBottom: 2 }}>{t.role}</div>
                <div className="msg-thread-preview">{t.preview}</div>
              </div>
              {t.unread && <div className="msg-unread-dot" />}
            </div>
          ))}
        </div>
      </div>

      {/* Conversation panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ fontSize: 24 }}>{thread.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{thread.name}</div>
            <div style={{ fontSize: 12, color: thread.statusColor }}>{thread.status}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(thread.ctaRoute)}>{thread.ctaLabel}</button>
        </div>

        {/* Messages */}
        <div ref={threadRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, scrollbarWidth: 'thin' }}>
          {msgs.map((msg, i) => {
            if (msg.type === 'event' || msg.type === 'note') {
              return (
                <div key={i} style={{ textAlign: 'center', padding: 8, background: msg.bg, border: `1px solid ${msg.border}`, borderRadius: 'var(--r)', fontSize: 12, color: msg.color, fontWeight: msg.type === 'event' ? 600 : 400 }}>
                  {msg.text}
                </div>
              );
            }
            if (msg.from === 'them') {
              return (
                <div key={i} style={{ display: 'flex', gap: 9, maxWidth: '76%' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(20,24,50,.9)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginTop: 2 }}>{msg.avatar}</div>
                  <div>
                    <div style={{ background: 'var(--surface2)', borderRadius: '0 12px 12px 12px', padding: '10px 13px', fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>{msg.text}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, paddingLeft: 2 }}>{msg.time}</div>
                  </div>
                </div>
              );
            }
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'row-reverse', gap: 9, maxWidth: '76%', alignSelf: 'flex-end' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#0d9488,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0, marginTop: 2 }}>JM</div>
                <div>
                  <div style={{ background: 'var(--violet-grad)', borderRadius: '12px 0 12px 12px', padding: '10px 13px', fontSize: 14, color: '#fff', lineHeight: 1.6 }}>{msg.text}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, textAlign: 'right', paddingRight: 2 }}>{msg.time}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 8, flexShrink: 0 }}>
          <input className="inp" placeholder={`Reply to ${thread.name}…`} style={{ flex: 1 }}
            value={inputs[active]}
            onChange={e => setInputs(prev => ({ ...prev, [active]: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') handleSend(active); }} />
          <button className="btn btn-violet btn-sm" onClick={() => handleSend(active)}>Send →</button>
        </div>
      </div>
    </div>
  );
}
