import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useMessages } from '../../context/MessageContext';

// ── Employer nav config ──────────────────────────────────────────
const empNav = [
  {
    id: 'emp-dashboard', label: 'Dashboard', icon: '⊞',
  },
  {
    id: 'emp-pipeline-group', label: 'Hiring', icon: '⬡', drawer: 'emp-pipeline-drawer',
    sub: [
      { id: 'emp-pipeline',   label: 'Pipeline' },
      { id: 'emp-candidates', label: 'Candidates' },
      { id: 'emp-jobs',       label: 'Job listings' },
      { id: 'emp-create-job', label: 'Post a role' },
    ]
  },
  {
    id: 'emp-talent-group', label: 'Talent', icon: '🧬', drawer: 'emp-talent-drawer',
    dna: true,
    sub: [
      { id: 'emp-bench',       label: 'The Bench™',    dna: true },
      { id: 'emp-team-dna',    label: 'Team DNA',      dna: true },
      { id: 'emp-offer-intel', label: 'Offer Intel' },
      { id: 'emp-vault',       label: 'Process Vault™' },
    ]
  },
  {
    id: 'emp-intel-group', label: 'Intel', icon: '◈', drawer: 'emp-intel-drawer',
    sub: [
      { id: 'emp-tracker', label: 'Hire Tracker' },
      { id: 'emp-reviews', label: 'Reviews', badge: '2', badgeColor: 'amber' },
      { id: 'emp-pulse',   label: 'Team Pulse' },
    ]
  },
  {
    id: 'emp-messages', label: 'Messages', icon: '💬',
  },
  {
    id: 'emp-settings-group', label: 'Settings', icon: '⚙', drawer: 'emp-settings-drawer',
    sub: [
      { id: 'emp-company',  label: 'Company profile' },
      { id: 'emp-ghosting', label: 'Ghosting Score' },
      { id: 'emp-pricing',  label: 'Plan & billing' },
      { id: 'emp-settings', label: 'Account settings' },
      { id: 'referral',     label: 'Refer & Earn 🎁' },
    ]
  },
];

// ── Candidate nav config ─────────────────────────────────────────
const candNav = [
  {
    id: 'cand-home', label: 'Home', icon: '⊞',
  },
  {
    id: 'cand-browse-group', label: 'Discover', icon: '◎', drawer: 'cand-browse-drawer',
    sub: [
      { id: 'cand-jobs',    label: 'Jobs' },
      { id: 'cand-matches', label: 'Matches', badgeColor: 'green' },
      { id: 'cand-apps',    label: 'Applications' },
    ]
  },
  {
    id: 'cand-messages', label: 'Messages', icon: '💬',
  },
  {
    id: 'cand-career-group', label: 'Career OS', icon: '🧬', drawer: 'cand-career-drawer',
    dna: true,
    sub: [
      { id: 'cand-work-dna',    label: 'Work DNA™',       dna: true },
      { id: 'cand-trajectory',  label: 'Trajectory' },
      { id: 'cand-bench',       label: 'The Bench™',      dna: true },
      { id: 'cand-offer-intel', label: 'Offer Intel' },
      { id: 'cand-vault',       label: 'Interview Vault™' },
      { id: 'cand-pulse',       label: 'Career Pulse' },
    ]
  },
  {
    id: 'cand-me-group', label: 'Me', icon: '◉', drawer: 'cand-me-drawer',
    sub: [
      { id: 'cand-profile',  label: 'My profile' },
      { id: 'cand-reviews',  label: 'Reviews' },
      { id: 'cand-ghosting', label: 'Reliability Score' },
      { id: 'cand-stealth',  label: 'Stealth & privacy' },
      { id: 'cand-settings', label: 'Account settings' },
      { id: 'referral',      label: 'Refer & Earn 🎁' },
    ]
  },
];

// ── Helper: which drawer owns this route ─────────────────────────
function getDrawerForRoute(route) {
  const allNav = [...empNav, ...candNav];
  for (const item of allNav) {
    if (item.sub?.find(s => s.id === route)) return item.drawer;
  }
  return null;
}

// ── Single nav item ──────────────────────────────────────────────
function SidebarItem({ item, currentRoute, navigate, openDrawers, setOpenDrawers }) {
  const isActive   = currentRoute === item.id;
  const drawerOpen = item.drawer && openDrawers.includes(item.drawer);
  const subActive  = item.sub?.some(s => s.id === currentRoute);

  function handleClick() {
    if (item.sub) {
      setOpenDrawers(prev =>
        prev.includes(item.drawer)
          ? prev.filter(d => d !== item.drawer)
          : [...prev, item.drawer]
      );
    } else {
      navigate(item.id);
    }
  }

  return (
    <>
      {/* ── Top-level button ── */}
      <button
        onClick={handleClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '8px 10px', borderRadius: 'var(--r)',
          cursor: 'pointer', fontSize: 14,
          fontWeight: subActive || isActive ? 600 : 500,
          color: subActive || isActive ? '#fff' : 'var(--text2)',
          background: subActive || isActive
            ? (item.dna ? 'rgba(236,72,153,0.15)' : 'rgba(108,71,255,0.18)')
            : 'none',
          border: 'none', width: '100%', textAlign: 'left',
          whiteSpace: 'nowrap', position: 'relative',
          transition: 'all .15s', fontFamily: 'Inter',
        }}
      >
        {/* Active indicator bar */}
        {(subActive || isActive) && (
          <div style={{
            position: 'absolute', left: 0, top: '20%', bottom: '20%',
            width: 3, borderRadius: '0 3px 3px 0',
            background: item.dna
              ? 'linear-gradient(180deg,#ec4899,#6c47ff)'
              : 'var(--violet)',
          }} />
        )}

        {/* Icon */}
        <span style={{
          width: 18, height: 18, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 14, flexShrink: 0,
          opacity: subActive || isActive ? 1 : 0.75,
          color: item.dna ? '#f9a8d4' : undefined,
        }}>
          {item.icon}
        </span>

        {/* Label */}
        <span style={{
          flex: 1,
          color: item.dna
            ? (subActive || isActive ? '#fbcfe8' : '#f9a8d4')
            : undefined,
        }}>
          {item.label}
        </span>

        {/* Badge */}
        {item.badge && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 18, height: 18, borderRadius: 999,
            fontSize: 10, fontWeight: 700, padding: '0 5px', flexShrink: 0,
            background: item.badgeColor === 'amber'
              ? 'var(--amber)'
              : item.badgeColor === 'green'
                ? 'var(--green)'
                : 'var(--violet)',
            color: '#fff',
          }}>{item.badge}</span>
        )}

        {/* Chevron */}
        {item.sub && (
          <span style={{
            fontSize: 10, opacity: 0.4,
            transform: drawerOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform .2s',
          }}>▼</span>
        )}
      </button>

      {/* ── Drawer ── */}
      {item.sub && (
        <div style={{
          overflow: 'hidden',
          maxHeight: drawerOpen ? 500 : 0,
          opacity: drawerOpen ? 1 : 0,
          transition: 'max-height 0.28s cubic-bezier(.4,0,.2,1), opacity 0.2s',
          pointerEvents: drawerOpen ? 'auto' : 'none',
        }}>
          <div style={{
            padding: '4px 10px 6px',
            display: 'flex', flexDirection: 'column', gap: 1,
          }}>
            {item.sub.map(sub => {
              const active = currentRoute === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => navigate(sub.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px 6px 30px',
                    borderRadius: 10, cursor: 'pointer', fontSize: 12,
                    fontWeight: active ? 600 : 500,
                    color: active
                      ? (sub.dna ? '#f9a8d4' : '#a78bfa')
                      : 'var(--text3)',
                    background: active
                      ? (sub.dna ? 'rgba(236,72,153,0.1)' : 'rgba(108,71,255,0.1)')
                      : 'none',
                    border: 'none', width: '100%', textAlign: 'left',
                    whiteSpace: 'nowrap', position: 'relative',
                    transition: 'all .14s', fontFamily: 'Inter',
                  }}
                >
                  {/* Dot */}
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%',
                    position: 'absolute', left: 15, top: '50%',
                    transform: 'translateY(-50%)',
                    background: active
                      ? (sub.dna ? '#ec4899' : 'var(--violet)')
                      : 'rgba(255,255,255,0.18)',
                    transition: 'background .14s',
                  }} />

                  {sub.label}

                  {/* Sub-badge */}
                  {sub.badge && (
                    <span style={{
                      marginLeft: 'auto',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 16, height: 16, borderRadius: 999,
                      fontSize: 10, fontWeight: 700, padding: '0 4px',
                      background: sub.badgeColor === 'amber'
                        ? 'var(--amber)'
                        : sub.badgeColor === 'green'
                          ? 'var(--green)'
                          : 'var(--violet)',
                      color: '#fff',
                    }}>{sub.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

// ── Main export ──────────────────────────────────────────────────
export default function Sidebar() {
  const { mode, currentRoute, navigate } = useApp();
  const { profile } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const { unreadCount: unreadMessages } = useMessages();
  
  const isEmployer = profile?.mode === 'employer';
  let nav = isEmployer ? [...empNav] : [...candNav];

  const unreadMatches = notifications.filter(n => !n.read && n.route === 'cand-matches').length;

  // Update message badge dynamically
  if (mode === 'candidate') {
    nav = nav.map(item => {
      if (item.id === 'cand-messages') {
        return { ...item, badge: unreadMessages > 0 ? unreadMessages.toString() : null };
      }
      if (item.id === 'cand-browse-group') {
        return {
          ...item,
          sub: item.sub.map(s => {
            if (s.id === 'cand-matches') {
              return { ...s, badge: unreadMatches > 0 ? unreadMatches.toString() : null };
            }
            return s;
          })
        };
      }
      return item;
    });
  }

  // Employer message badge
  if (mode === 'employer' || isEmployer) {
    nav = nav.map(item => {
      if (item.id === 'emp-messages') {
        return { ...item, badge: unreadMessages > 0 ? unreadMessages.toString() : null, badgeColor: 'violet' };
      }
      return item;
    });
  }

  // Admin nav item — shown to admin users only
  const isAdmin = profile?.mode === 'admin' || profile?.email === 'helio.silva1961@gmail.com';
  if (isAdmin) {
    nav = [
      { id: 'admin', label: 'Admin Panel', icon: '⚡' },
      ...nav,
    ];
  }

  // Inject notifications at the top if there are unread ones
  if (unreadCount > 0) {
    nav = [
      { id: 'notifications', label: 'Notifications', icon: '🔔', badge: unreadCount.toString(), badgeColor: 'violet' },
      ...nav
    ];
  }

  const [openDrawers, setOpenDrawers] = useState([]);

  // Auto-open the drawer that owns the current route
  useEffect(() => {
    const drawer = getDrawerForRoute(currentRoute);
    if (drawer) setOpenDrawers([drawer]);
  }, [currentRoute]);

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const user = isEmployer
    ? {
        initials: getInitials(profile?.full_name || profile?.company_name || '?'),
        name: profile?.full_name || profile?.company_name || 'Your account',
        role: profile?.job_title || 'Employer',
      }
    : {
        initials: getInitials(profile?.full_name || '?'),
        name: profile?.full_name || 'Your account',
        role: profile?.job_title || 'Candidate',
      };

  const settingsRoute = isEmployer ? 'emp-settings' : 'cand-settings';

  return (
    <div style={{
      width: 220, flexShrink: 0,
      background: 'rgba(8,9,20,0.98)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>

      {/* Primary nav */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 2,
        padding: '10px 10px 0', flex: 1, overflowY: 'auto',
      }}>
        {nav.map((item, i) => (
          <div key={item.id}>
            {i > 0 && !item.sub && !nav[i - 1]?.sub && (
              <hr style={{
                margin: '8px 10px', border: 'none',
                borderTop: '1px solid rgba(255,255,255,0.07)',
              }} />
            )}
            <SidebarItem
              item={item}
              currentRoute={currentRoute}
              navigate={navigate}
              openDrawers={openDrawers}
              setOpenDrawers={setOpenDrawers}
            />
          </div>
        ))}
      </div>

      {/* Footer — clicking navigates to settings */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: 10 }}>
        <div
          onClick={() => navigate(settingsRoute)}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 10px', borderRadius: 'var(--r)',
            cursor: 'pointer', transition: 'background .15s',
            background: currentRoute === settingsRoute
              ? 'rgba(108,71,255,0.12)'
              : 'none',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={e => e.currentTarget.style.background =
            currentRoute === settingsRoute ? 'rgba(108,71,255,0.12)' : 'none'}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 'var(--rp)',
            background: 'var(--violet-grad)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>{user.initials}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: 'var(--text)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{user.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{user.role}</div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text3)', flexShrink: 0 }}>⚙</span>
        </div>
      </div>

    </div>
  );
}
