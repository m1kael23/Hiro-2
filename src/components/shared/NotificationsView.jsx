import { useNotifications } from '../../context/NotificationContext';
import { useApp } from '../../context/AppContext';

export default function NotificationsView() {
  const { notifications, markRead, markAllRead } = useNotifications();
  const { navigate } = useApp();

  const handleNotifClick = async (n) => {
    await markRead(n.id);
    if (n.type === 'interest') navigate('emp-candidates');
    else if (n.type === 'match') navigate('cand-matches');
    else if (n.type === 'application') navigate('emp-pipeline');
    else if (n.route) navigate(n.route);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)' }}>Notifications</h1>
        <button 
          onClick={markAllRead}
          style={{ 
            background: 'none', border: 'none', color: 'var(--violet)', 
            cursor: 'pointer', fontSize: '14px', fontWeight: 600 
          }}
        >
          Mark all as read
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {notifications.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>
            No notifications yet.
          </div>
        )}
        {notifications.map(n => (
          <div 
            key={n.id}
            onClick={() => handleNotifClick(n)}
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: n.read ? 'rgba(255,255,255,0.03)' : 'rgba(108,71,255,0.08)',
              border: '1px solid rgba(255,255,255,0.05)',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '24px' }}>
              {n.type === 'interest' ? '✨' : n.type === 'match' ? '🤝' : '🔔'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{n.title}</div>
              <div style={{ color: 'var(--text2)', fontSize: '14px' }}>{n.message}</div>
              <div style={{ color: 'var(--text3)', fontSize: '12px', marginTop: '8px' }}>
                {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : 'Just now'}
              </div>
            </div>
            {!n.read && (
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--violet)', marginTop: '8px' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
