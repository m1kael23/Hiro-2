import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

export default function Topbar() {
  const { navigate } = useApp();
  const { profile, signOut } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const [menuOpen,   setMenuOpen]   = useState(false);
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [searchVal,  setSearchVal]  = useState('');

  const menuRef  = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e) {
      if (menuRef.current  && !menuRef.current.contains(e.target))  setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Sign out ─────────────────────────────────────────────────────
  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
  }

  // ── Derived display values ────────────────────────────────────────
  const isEmployer = profile?.mode === 'employer';

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const user = isEmployer
    ? { 
        initials: getInitials(profile?.full_name || 'Jamie Donovan'), 
        name: profile?.full_name || 'Jamie Donovan', 
        role: profile?.job_title || 'Head of Talent', 
        company: profile?.company_name || 'Monzo' 
      }
    : { 
        initials: getInitials(profile?.full_name || 'Jordan Mitchell'), 
        name: profile?.full_name || 'Jordan Mitchell', 
        role: profile?.job_title || 'Senior PM', 
        company: null 
      };

  const settingsRoute = isEmployer ? 'emp-settings' : 'cand-settings';

  function formatTime(ts) {
    if (!ts) return 'Just now';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  const handleNotifClick = async (n) => {
    await markRead(n.id);
    setNotifOpen(false);

    // Redirection logic
    if (n.type === 'interest') {
      navigate('emp-candidates');
    } else if (n.type === 'match') {
      navigate('cand-matches');
    } else if (n.type === 'application') {
      navigate('emp-pipeline');
    } else if (n.route) {
      navigate(n.route);
    }
  };

  return (
    <div style={{
      height: 52,
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 10,
      background: 'rgba(8,9,20,0.98)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      flexShrink: 0,
      position: 'relative',
      zIndex: 100,
    }}>

      {/* ── Logo ──────────────────────────────────────────────────── */}
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: 'linear-gradient(135deg,#6c47ff,#4338ca)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 800, color: '#fff',
        boxShadow: '0 2px 10px rgba(108,71,255,.5)',
        marginRight: 4,
      }}>H</div>

      {/* ── Mode badge ────────────────────────────────────────────── */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 999,
        background: isEmployer ? 'rgba(108,71,255,.15)' : 'rgba(236,72,153,.12)',
        border: `1px solid ${isEmployer ? 'rgba(108,71,255,.3)' : 'rgba(236,72,153,.3)'}`,
        fontSize: 11, fontWeight: 700,
        color: isEmployer ? '#a78bfa' : '#f9a8d4',
        flexShrink: 0,
      }}>
        {isEmployer ? '🏢' : '👤'} {isEmployer ? 'Employer' : 'Candidate'}
      </div>

      {/* ── Search ────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, maxWidth: 360,
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,.05)',
        border: '1px solid rgba(255,255,255,.09)',
        borderRadius: 999,
        padding: '0 12px',
        height: 32,
        marginLeft: 8,
        transition: 'border-color .15s',
      }}
        onFocus={e => e.currentTarget.style.borderColor = 'rgba(108,71,255,.4)'}
        onBlur={e  => e.currentTarget.style.borderColor = 'rgba(255,255,255,.09)'}
      >
        <span style={{ fontSize: 12, opacity: 0.4 }}>🔍</span>
        <input
          value={searchVal}
          onChange={e => setSearchVal(e.target.value)}
          placeholder="Search…"
          style={{
            flex: 1, border: 'none', background: 'none',
            color: 'var(--text)', fontSize: 13,
            fontFamily: 'Inter, sans-serif', outline: 'none',
          }}
        />
        <span style={{
          fontSize: 10, opacity: 0.3,
          background: 'rgba(255,255,255,.08)',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 4, padding: '1px 5px',
          fontFamily: 'Inter, sans-serif',
          color: 'var(--text2)',
        }}>⌘K</span>
      </div>

      {/* ── Right controls ────────────────────────────────────────── */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>

        {/* Notifications bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setNotifOpen(o => !o); setMenuOpen(false); }}
            style={{
              width: 34, height: 34, borderRadius: 10,
              border: notifOpen ? '1px solid rgba(108,71,255,.4)' : '1px solid transparent',
              background: notifOpen ? 'rgba(108,71,255,.1)' : 'rgba(255,255,255,.04)',
              cursor: 'pointer', fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', transition: 'all .15s',
            }}
            onMouseEnter={e => { if (!notifOpen) e.currentTarget.style.background = 'rgba(255,255,255,.08)'; }}
            onMouseLeave={e => { if (!notifOpen) e.currentTarget.style.background = 'rgba(255,255,255,.04)'; }}
          >
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 7, height: 7, borderRadius: '50%',
                background: '#6c47ff',
                border: '1.5px solid rgba(8,9,20,.98)',
              }} />
            )}
          </button>

          {/* Notifications dropdown */}
          {notifOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 320,
              background: 'rgba(12,14,26,.98)',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 14,
              boxShadow: '0 16px 48px rgba(0,0,0,.6)',
              overflow: 'hidden',
              zIndex: 300,
            }}>
              <div style={{
                padding: '12px 14px 10px',
                borderBottom: '1px solid rgba(255,255,255,.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Notifications</span>
                {unreadCount > 0 && (
                  <span 
                    style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', cursor: 'pointer' }}
                    onClick={markAllRead}
                  >
                    Mark all read
                  </span>
                )}
              </div>
              {notifications.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
                  No notifications yet
                </div>
              )}
              {notifications.map(n => (
                <div key={n.id} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '10px 14px',
                  background: !n.read ? 'rgba(108,71,255,.04)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,.04)',
                  cursor: 'pointer', transition: 'background .12s',
                }}
                  onClick={() => handleNotifClick(n)}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = !n.read ? 'rgba(108,71,255,.04)' : 'transparent'}
                >
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                    {n.type === 'interest' ? '✨' : n.type === 'match' ? '🤝' : '🔔'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, fontWeight: !n.read ? 600 : 400 }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>{n.message}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{formatTime(n.createdAt)}</div>
                  </div>
                  {!n.read && (
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#6c47ff', flexShrink: 0, marginTop: 5,
                    }} />
                  )}
                </div>
              ))}
              <div style={{ padding: '8px 14px', textAlign: 'center' }}>
                <span 
                  style={{ fontSize: 12, color: 'var(--text3)', cursor: 'pointer' }}
                  onClick={() => { navigate('notifications'); setNotifOpen(false); }}
                >
                  View all notifications
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Avatar + menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setMenuOpen(o => !o); setNotifOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '4px 8px 4px 4px',
              borderRadius: 999,
              border: menuOpen ? '1px solid rgba(108,71,255,.4)' : '1px solid rgba(255,255,255,.09)',
              background: menuOpen ? 'rgba(108,71,255,.08)' : 'rgba(255,255,255,.04)',
              cursor: 'pointer', transition: 'all .15s',
            }}
            onMouseEnter={e => { if (!menuOpen) { e.currentTarget.style.background = 'rgba(255,255,255,.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.15)'; }}}
            onMouseLeave={e => { if (!menuOpen) { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.09)'; }}}
          >
            {/* Avatar circle */}
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: isEmployer
                ? 'linear-gradient(135deg,#6c47ff,#4338ca)'
                : 'linear-gradient(135deg,#ec4899,#be185d)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>{user.initials}</div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{user.initials}</span>
            <span style={{
              fontSize: 9, opacity: 0.4,
              transform: menuOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform .2s',
              color: 'var(--text)',
            }}>▼</span>
          </button>

          {/* Avatar dropdown menu */}
          {menuOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 220,
              background: 'rgba(12,14,26,.98)',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 14,
              boxShadow: '0 16px 48px rgba(0,0,0,.6)',
              overflow: 'hidden',
              zIndex: 300,
            }}>

              {/* User info header */}
              <div style={{
                padding: '14px 14px 12px',
                borderBottom: '1px solid rgba(255,255,255,.06)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{user.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {isEmployer ? `Employer mode · ${user.company}` : `Candidate · ${user.role}`}
                </div>
              </div>

              {/* Settings & sign out */}
              <div style={{ padding: '6px 8px 8px' }}>
                <MenuItem
                  icon="⚙️"
                  label="Settings"
                  onClick={() => { navigate(settingsRoute); setMenuOpen(false); }}
                />
                <MenuItem
                  icon="→"
                  label="Sign out"
                  danger
                  onClick={handleSignOut}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Small helper: menu item ──────────────────────────────────────
function MenuItem({ icon, label, active, danger, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        width: '100%', padding: '8px 10px',
        borderRadius: 9, border: 'none',
        background: hovered
          ? danger
            ? 'rgba(251,113,133,.08)'
            : 'rgba(255,255,255,.06)'
          : 'transparent',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        color: danger
          ? 'var(--red)'
          : active
            ? '#fff'
            : 'var(--text2)',
        fontFamily: 'Inter, sans-serif',
        textAlign: 'left',
        transition: 'background .12s, color .12s',
      }}
    >
      <span style={{ fontSize: 14, opacity: active || danger ? 1 : 0.7 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {active && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#6c47ff', flexShrink: 0,
        }} />
      )}
    </button>
  );
}
