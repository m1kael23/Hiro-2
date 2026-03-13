import { useNotifications } from '../../context/NotificationContext';
import { useApp } from '../../context/AppContext';

// Type → visual config
const TYPE_CONFIG = {
  match:          { emoji: '🤝', label: 'Match',        color: 'var(--violet)',  bg: 'rgba(108,71,255,0.08)',   border: 'rgba(108,71,255,0.2)'  },
  interest:       { emoji: '✨', label: 'Interest',     color: '#a78bfa',        bg: 'rgba(167,139,250,0.07)', border: 'rgba(167,139,250,0.2)' },
  application:    { emoji: '📥', label: 'Application',  color: 'var(--cyan)',    bg: 'rgba(56,189,248,0.07)',  border: 'rgba(56,189,248,0.2)'  },
  ghost_flag:     { emoji: '👻', label: 'Ghost Alert',  color: 'var(--amber)',   bg: 'rgba(245,158,11,0.07)',  border: 'rgba(245,158,11,0.2)'  },
  bench_view:     { emoji: '👀', label: 'Bench View',   color: 'var(--teal)',    bg: 'rgba(13,148,136,0.07)', border: 'rgba(13,148,136,0.2)'  },
  bench_interest: { emoji: '🏷️', label: 'Bench',        color: 'var(--teal)',    bg: 'rgba(13,148,136,0.07)', border: 'rgba(13,148,136,0.2)'  },
  pulse_drift:    { emoji: '⚠️', label: 'Pulse Drift',  color: 'var(--amber)',   bg: 'rgba(245,158,11,0.07)',  border: 'rgba(245,158,11,0.2)'  },
  pulse_due:      { emoji: '💓', label: 'Pulse Due',    color: '#ec4899',        bg: 'rgba(236,72,153,0.07)', border: 'rgba(236,72,153,0.2)'  },
  offer_deadline: { emoji: '🔔', label: 'Offer',        color: '#f97316',        bg: 'rgba(249,115,22,0.07)', border: 'rgba(249,115,22,0.2)'  },
  decay_alert:    { emoji: '⏳', label: 'Decay Alert',  color: '#f97316',        bg: 'rgba(249,115,22,0.07)', border: 'rgba(249,115,22,0.2)'  },
  message:        { emoji: '💬', label: 'Message',      color: 'var(--cyan)',    bg: 'rgba(56,189,248,0.07)',  border: 'rgba(56,189,248,0.2)'  },
  review:         { emoji: '⭐', label: 'Review',       color: 'var(--amber)',   bg: 'rgba(245,158,11,0.07)',  border: 'rgba(245,158,11,0.2)'  },
  system:         { emoji: '🔔', label: 'System',       color: 'var(--text2)',   bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.07)' },
};

function cfg(type) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.system;
}

function timeAgo(ts) {
  if (!ts) return 'Just now';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const FILTER_OPTIONS = [
  { key: 'all',      label: 'All' },
  { key: 'unread',   label: 'Unread' },
  { key: 'match',    label: '🤝 Matches' },
  { key: 'bench_view,bench_interest', label: '👀 Bench' },
  { key: 'pulse_drift,pulse_due',     label: '💓 Pulse' },
  { key: 'ghost_flag',                label: '👻 Ghost' },
  { key: 'offer_deadline,decay_alert', label: '🔔 Offers' },
];

export default function NotificationsView() {
  const { notifications, markRead, markAllRead, unreadCount } = useNotifications();
  const { navigate } = useApp();

  // Simple local filter state — no useState import needed via inline ref
  const [filter, setFilter] = window.__notifFilter || (window.__notifFilter = [null, (v) => { window.__notifFilter[0] = v; }]);
  // Use proper React state
  const [activeFilter, setActiveFilter] = window.React?.useState
    ? window.React.useState('all')
    : ['all', () => {}];

  const handleNotifClick = async (n) => {
    await markRead(n.id);
    if (n.route) navigate(n.route);
    else if (n.type === 'interest')    navigate('emp-candidates');
    else if (n.type === 'match')       navigate('cand-matches');
    else if (n.type === 'application') navigate('emp-pipeline');
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'all')    return true;
    if (activeFilter === 'unread') return !n.read;
    return activeFilter.split(',').includes(n.type);
  });

  const urgentNotifications = notifications.filter(n =>
    !n.read && ['offer_deadline', 'decay_alert', 'ghost_flag', 'pulse_drift'].includes(n.type)
  );

  return (
    <div className="scroll">
      <div style={{ padding: '40px', maxWidth: '840px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Notifications</h1>
            {unreadCount > 0 && (
              <div style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px' }}>
                {unreadCount} unread{urgentNotifications.length > 0 && ` · ${urgentNotifications.length} urgent`}
              </div>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{ background: 'none', border: 'none', color: 'var(--violet)', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Urgent banner */}
        {urgentNotifications.length > 0 && (
          <div style={{
            marginBottom: '20px',
            padding: '14px 16px',
            borderRadius: '12px',
            background: 'rgba(249,115,22,0.08)',
            border: '1px solid rgba(249,115,22,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span style={{ fontSize: '18px' }}>🚨</span>
            <div style={{ flex: 1, fontSize: '14px', color: 'var(--text2)' }}>
              You have <strong style={{ color: '#f97316' }}>{urgentNotifications.length} urgent notification{urgentNotifications.length > 1 ? 's' : ''}</strong> — offer deadlines, ghost flags, or critical pulse drift that need your attention.
            </div>
          </div>
        )}

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {FILTER_OPTIONS.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                border: `1px solid ${activeFilter === f.key ? 'var(--violet)' : 'rgba(255,255,255,0.1)'}`,
                background: activeFilter === f.key ? 'rgba(108,71,255,0.15)' : 'rgba(255,255,255,0.03)',
                color: activeFilter === f.key ? 'var(--violet)' : 'var(--text2)',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredNotifications.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text3)' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔔</div>
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px', color: 'var(--text2)' }}>All quiet</div>
              <div style={{ fontSize: '14px' }}>Notifications will appear here as you get matches, Bench views, pulse nudges, and more.</div>
            </div>
          )}

          {filteredNotifications.map(n => {
            const c = cfg(n.type);
            const isUrgent = ['offer_deadline', 'decay_alert', 'ghost_flag'].includes(n.type) && !n.read;
            return (
              <div
                key={n.id}
                onClick={() => handleNotifClick(n)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: n.read ? 'rgba(255,255,255,0.02)' : c.bg,
                  border: `1px solid ${n.read ? 'rgba(255,255,255,0.05)' : c.border}`,
                  cursor: n.route ? 'pointer' : 'default',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                  transition: 'transform 0.15s, opacity 0.15s',
                  opacity: n.read ? 0.65 : 1,
                  ...(isUrgent ? { boxShadow: `0 0 0 1px ${c.border}` } : {}),
                }}
                onMouseEnter={e => { if (n.route) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {/* Icon */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: n.read ? 'rgba(255,255,255,0.04)' : `${c.bg}`,
                  border: `1px solid ${n.read ? 'rgba(255,255,255,0.07)' : c.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0,
                }}>
                  {c.emoji}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>{n.title}</span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '20px',
                      background: n.read ? 'rgba(255,255,255,0.05)' : c.bg,
                      border: `1px solid ${c.border}`,
                      color: c.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}>
                      {c.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.55, marginBottom: '6px' }}>{n.message}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{timeAgo(n.createdAt)}</div>
                </div>

                {/* Unread dot + action arrow */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {!n.read && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.color }} />
                  )}
                  {n.route && (
                    <div style={{ fontSize: '16px', color: 'var(--text3)', marginTop: 'auto' }}>→</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom info */}
        {notifications.length > 0 && filteredNotifications.length > 0 && (
          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--text3)' }}>
            Showing {filteredNotifications.length} of {notifications.length} notifications · Last 20 shown
          </div>
        )}
      </div>
    </div>
  );
}
