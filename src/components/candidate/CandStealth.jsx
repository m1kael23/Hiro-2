import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, orderBy, limit,
  getDocs, addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useApp }  from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

const openModes = [
  { id:'actively', icon:'🔥', label:'Actively looking',  sub:'Surfaced first · fast-tracked', selClass:'green-sel',
    desc:'You appear at the top of employer searches. Hiro sends your profile to relevant roles daily. All mutual matches are fast-tracked.' },
  { id:'passive',  icon:'👀', label:'Passively open',     sub:'Discoverable · not promoted',
    desc:'Your profile is visible but not actively promoted. Employers can find you and reach out if you\'re a strong match.' },
  { id:'not',      icon:'🔒', label:'Not looking',        sub:'Hidden · matches paused',
    desc:'Your profile is hidden from all employer searches. Existing matches remain active, but no new matches will be created.' },
];

const visOptions = {
  name:     { label:'Your name',           sub:'Show full name or initials only',    opts:[{id:'full',lbl:'Full'},{id:'initials',lbl:'Initials'}],                         init:'full'    },
  employer: { label:'Current employer',    sub:'Hide where you work now',            opts:[{id:'visible',lbl:'Visible'},{id:'hidden',lbl:'Hidden'}],                      init:'hidden'  },
  salary:   { label:'Salary expectations', sub:'Who can see your target comp',       opts:[{id:'all',lbl:'All'},{id:'matches',lbl:'Matches'},{id:'hidden',lbl:'Hidden'}], init:'matches' },
  dna:      { label:'Work DNA card',       sub:'Your working style fingerprint',     opts:[{id:'all',lbl:'All'},{id:'matches',lbl:'Matches'},{id:'hidden',lbl:'Hidden'}], init:'all'     },
  photo:    { label:'Profile photo',       sub:'Show or blur your photo',            opts:[{id:'visible',lbl:'Visible'},{id:'blurred',lbl:'Blurred'}],                    init:'visible' },
};

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
}

function relativeTime(ts) {
  if (!ts) return '';
  const ms = ts?.toMillis ? ts.toMillis() : (ts?.seconds ? ts.seconds * 1000 : Date.now());
  const diff = Date.now() - ms;
  if (diff < 60000)     return 'Just now';
  if (diff < 3600000)   return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000)  return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 172800000) return 'Yesterday';
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(ms).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
}

function logDisplay(event) {
  switch (event.type) {
    case 'bench_view':   return { icon:'👁️', text:`${event.meta?.companyName || 'A company'} viewed your Bench profile`, color:'var(--text2)' };
    case 'stealth_on':   return { icon:'🔒', text:'Stealth mode activated',    color:'var(--cyan)'  };
    case 'stealth_off':  return { icon:'🔓', text:'Stealth mode deactivated',  color:'var(--text3)' };
    case 'blocked':      return { icon:'🚫', text:`Blocked: ${event.meta?.company || ''}`, color:'var(--red)'   };
    case 'unblocked':    return { icon:'✅', text:`Unblocked: ${event.meta?.company || ''}`, color:'var(--text3)' };
    case 'visibility_changed': return { icon:'⚙️', text:`Visibility updated: ${event.meta?.field || ''} → ${event.meta?.value || ''}`, color:'var(--text2)' };
    case 'match':        return { icon:'🤝', text:`Matched with ${event.meta?.companyName || 'a company'}`, color:'var(--green)' };
    default:             return { icon:'🔹', text:event.message || event.type, color:'var(--text2)' };
  }
}

export default function CandStealth() {
  const { showToast }              = useApp();
  const { profile, updateProfile } = useAuth();

  const [stealth,    setStealth]    = useState(profile?.stealth_mode || false);
  const [openMode,   setOpenMode]   = useState(profile?.open_mode    || 'actively');
  const [vis,        setVis]        = useState(() =>
    Object.fromEntries(Object.entries(visOptions).map(([k, v]) => [k, profile?.[`vis_${k}`] || v.init]))
  );
  const [blockInput, setBlockInput] = useState('');
  const [blocked,    setBlocked]    = useState([]);
  const [privacyLog, setPrivacyLog] = useState([]);
  const [stats,      setStats]      = useState({ views: 0, matches: 0 });
  const [logLoading, setLogLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setLogLoading(true);
    try {
      const blockedSnap = await getDocs(collection(db, 'users', profile.id, 'blocked_employers'));
      setBlocked(blockedSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const [notifSnap, stealthSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'notifications'),
          where('userId', '==', profile.id),
          where('type', 'in', ['bench_view', 'match', 'interest']),
          orderBy('createdAt', 'desc'),
          limit(20)
        )),
        getDocs(query(
          collection(db, 'users', profile.id, 'stealth_events'),
          orderBy('createdAt', 'desc'),
          limit(20)
        )),
      ]);

      const notifEvents  = notifSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const stealthEvnts = stealthSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const merged = [...notifEvents, ...stealthEvnts]
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
        .slice(0, 30);
      setPrivacyLog(merged);

      const weekAgo     = Date.now() - 7 * 86400000;
      const recentViews = notifEvents.filter(e => e.type === 'bench_view' && (e.createdAt?.toMillis?.() || 0) > weekAgo).length;

      let matchCount = 0;
      try {
        const ms = await getDocs(query(
          collection(db, 'applications'),
          where('candidateId', '==', profile.id),
          where('candidateExpressedInterest', '==', true),
          where('employerExpressedInterest',  '==', true)
        ));
        matchCount = ms.size;
      } catch (_) {}

      setStats({ views: recentViews, matches: matchCount });
    } catch (err) {
      console.error('[CandStealth]', err);
    } finally {
      setLogLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function toggleStealth() {
    const next = !stealth;
    setStealth(next);
    await updateProfile({ stealth_mode: next }).catch(console.error);
    await addDoc(collection(db, 'users', profile.id, 'stealth_events'), {
      type: next ? 'stealth_on' : 'stealth_off', createdAt: serverTimestamp(),
    }).catch(console.error);
    showToast(next ? 'Stealth mode enabled' : 'Stealth mode disabled', next ? 'success' : 'default');
    loadData();
  }

  async function changeOpenMode(id) {
    setOpenMode(id);
    await updateProfile({ open_mode: id }).catch(console.error);
    showToast('Status updated: ' + (openModes.find(m => m.id === id)?.label || id), 'success');
  }

  async function changeVis(key, val) {
    setVis(prev => ({ ...prev, [key]: val }));
    await updateProfile({ [`vis_${key}`]: val }).catch(console.error);
    await addDoc(collection(db, 'users', profile.id, 'stealth_events'), {
      type: 'visibility_changed', meta: { field: key, value: val }, createdAt: serverTimestamp(),
    }).catch(console.error);
  }

  async function addBlocked() {
    const val = blockInput.trim();
    if (!val) return;
    if (blocked.some(b => b.name?.toLowerCase() === val.toLowerCase())) {
      showToast(`${val} is already blocked`, 'default'); return;
    }
    try {
      const ref = await addDoc(collection(db, 'users', profile.id, 'blocked_employers'), {
        name: val, createdAt: serverTimestamp(),
      });
      setBlocked(prev => [...prev, { id: ref.id, name: val }]);
      await addDoc(collection(db, 'users', profile.id, 'stealth_events'), {
        type: 'blocked', meta: { company: val }, createdAt: serverTimestamp(),
      });
      setBlockInput('');
      showToast(`${val} blocked`, 'success');
    } catch { showToast('Could not block — try again', 'error'); }
  }

  async function removeBlocked(item) {
    try {
      await deleteDoc(doc(db, 'users', profile.id, 'blocked_employers', item.id));
      setBlocked(prev => prev.filter(b => b.id !== item.id));
      await addDoc(collection(db, 'users', profile.id, 'stealth_events'), {
        type: 'unblocked', meta: { company: item.name }, createdAt: serverTimestamp(),
      });
      showToast(`${item.name} unblocked`);
    } catch { showToast('Could not unblock — try again', 'error'); }
  }

  const fullName   = profile?.full_name || '';
  const curMode    = openModes.find(m => m.id === openMode);
  const vpName     = vis.name === 'full' ? fullName
    : fullName.split(' ')[0] + ' ' + fullName.split(' ').slice(1).map(n => n[0] + '.').join(' ');
  const vpEmployer = vis.employer === 'visible'
    ? `Current employer: ${profile?.company_name || 'your company'}` : 'Current employer hidden';
  const vpSalary   = vis.salary === 'all'
    ? `Salary: £${profile?.salary_min || '?'}k–£${profile?.salary_max || '?'}k`
    : vis.salary === 'matches' ? 'Salary: matches only' : 'Salary hidden';

  return (
    <div className="view-panel">
      <div className="scroll">
        <div className="stealth-shell">

          <div className="page-hdr" style={{ maxWidth:780, marginBottom:22 }}>
            <div>
              <div className="eyebrow">Privacy controls</div>
              <div className="page-title">Stealth &amp; Visibility</div>
              <div className="page-sub">Your job search. Your rules. What employers see — and don't.</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => showToast('Privacy log exported','success')}>Export audit log</button>
          </div>

          <div className="stealth-hero" style={{ maxWidth:780, marginBottom:18 }}>
            <div style={{ display:'flex', gap:24, alignItems:'flex-start' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
                  <span style={{ fontSize:44 }}>{stealth ? '🔒' : '🔓'}</span>
                  <div>
                    <div style={{ fontFamily:'Manrope,sans-serif', fontSize:20, fontWeight:800, color:'#fff', marginBottom:4 }}>Stealth mode</div>
                    <div style={{ fontSize:14, color:'var(--text3)', lineHeight:1.5 }}>
                      {stealth ? 'On — your current employer cannot see your profile' : 'Off — fully visible to all employers on Hiro'}
                    </div>
                  </div>
                </div>
                <div className="stealth-toggle-row" onClick={toggleStealth} style={{ maxWidth:520, cursor:'pointer' }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:3 }}>Enable stealth mode</div>
                    <div style={{ fontSize:12, color:'var(--text3)' }}>Your current employer and subsidiaries cannot find or view your profile</div>
                  </div>
                  <label className="toggle-switch" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={stealth} onChange={toggleStealth} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, flexShrink:0, width:274 }}>
                {[
                  { val:stats.views,    lbl:'Bench views\nthis week',  color:'var(--cyan)'  },
                  { val:blocked.length, lbl:'Employers\nblocked',      color:'var(--amber)' },
                  { val:stats.matches,  lbl:'Mutual\nmatches',         color:'var(--green)' },
                  { val:0,              lbl:'Visibility\nincidents',   color:'var(--text2)' },
                ].map((s,i) => (
                  <div key={i} className="stealth-stat">
                    <div className="stealth-stat-val" style={{ color:s.color }}>{s.val}</div>
                    <div className="stealth-stat-lbl" style={{ whiteSpace:'pre-line' }}>{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ maxWidth:780, marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <div className="card-title" style={{ marginBottom:0 }}>Open to opportunities</div>
              <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'rgba(108,71,255,.15)', color:'var(--violet)', border:'1px solid rgba(108,71,255,.3)' }}>Controls match surfacing</span>
            </div>
            <div style={{ fontSize:12, color:'var(--text2)', marginBottom:14 }}>How actively Hiro shows you to employers.</div>
            <div className="open-mode-grid">
              {openModes.map(m => (
                <div key={m.id}
                  className={`open-mode-btn${openMode === m.id ? ' selected'+(m.selClass?' '+m.selClass:'') : ''}`}
                  onClick={() => changeOpenMode(m.id)}>
                  <div className="open-mode-icon">{m.icon}</div>
                  <div className="open-mode-label" style={openMode===m.id&&m.id==='actively'?{color:'var(--green)'}:{}}>{m.label}</div>
                  <div className="open-mode-sublabel">{m.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:12, padding:'12px 14px', borderRadius:'var(--r)', background:'rgba(255,255,255,.04)', border:'1px solid var(--border2)', fontSize:12, color:'var(--text2)', lineHeight:1.7 }}>
              {curMode?.desc}
            </div>
          </div>

          <div style={{ maxWidth:780, display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div className="card">
              <div className="card-title" style={{ marginBottom:4 }}>Visibility controls</div>
              <div style={{ fontSize:12, color:'var(--text2)', marginBottom:14 }}>Fine-tune exactly what each employer sees.</div>
              {Object.entries(visOptions).map(([key, opt], i) => (
                <div key={key} className="vis-row" style={i===Object.keys(visOptions).length-1?{borderBottom:'none'}:{}}>
                  <div>
                    <div className="vis-label">{opt.label}</div>
                    <div className="vis-sub">{opt.sub}</div>
                  </div>
                  <div className="vis-btns">
                    {opt.opts.map(o => (
                      <button key={o.id} className={`vis-btn${vis[key]===o.id?' on':''}`} onClick={() => changeVis(key, o.id)}>{o.lbl}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="card">
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.14em', color:'var(--text3)', marginBottom:12 }}>What employers see</div>
                <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid var(--border2)', borderRadius:'var(--r)', padding:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                    <div style={{ width:38, height:38, borderRadius:11, background:'linear-gradient(135deg,#6c47ff,#a78bfa)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Manrope,sans-serif', fontSize:14, fontWeight:800, color:'#fff', flexShrink:0, filter:vis.photo==='blurred'?'blur(4px)':'none' }}>{getInitials(fullName)}</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, marginBottom:1 }}>{vpName || '—'}</div>
                      <div style={{ fontSize:12, color:'var(--text2)' }}>{profile?.job_title || 'Product Manager'}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:8 }}>
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'rgba(255,255,255,.07)', color:'var(--text3)', border:'1px solid var(--border2)' }}>{vpEmployer}</span>
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'rgba(255,255,255,.07)', color:'var(--text3)', border:'1px solid var(--border2)' }}>{vpSalary}</span>
                  </div>
                  <div style={{ fontSize:12, color:'var(--text2)' }}>{vis.dna==='hidden'?'🧬 DNA hidden':'🧬 Work DNA visible'}</div>
                </div>
              </div>

              <div className="card" style={{ flex:1 }}>
                <div className="card-title" style={{ marginBottom:4 }}>Employer block list</div>
                <div style={{ fontSize:12, color:'var(--text2)', marginBottom:12 }}>Blocked companies can never find, view or match with your profile.</div>
                <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                  <input className="inp" placeholder="Type company name…" style={{ flex:1, fontSize:14 }}
                    value={blockInput} onChange={e => setBlockInput(e.target.value)}
                    onKeyDown={e => { if(e.key==='Enter') addBlocked(); }} />
                  <button onClick={addBlocked} style={{ padding:'0 14px', height:36, borderRadius:'var(--r)', background:'rgba(239,68,68,.15)', border:'1px solid rgba(239,68,68,.35)', color:'#f87171', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>🚫 Block</button>
                </div>
                <div style={{ fontSize:12, color:'var(--text3)', marginBottom:10 }}>Tip: Block your current employer and their parent company.</div>
                <div>
                  {blocked.length === 0 && <div style={{ fontSize:12, color:'var(--text3)', textAlign:'center', padding:'12px 0' }}>No companies blocked yet.</div>}
                  {blocked.map(b => (
                    <div key={b.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'rgba(239,68,68,.07)', border:'1px solid rgba(239,68,68,.2)', borderRadius:'var(--r)', marginBottom:6, fontSize:13 }}>
                      <span style={{ flex:1, color:'var(--text)' }}>{b.name}</span>
                      <button onClick={() => removeBlocked(b)} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:16, lineHeight:1, padding:0 }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ maxWidth:780, marginBottom:24 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div className="card-title" style={{ marginBottom:0 }}>Privacy activity log</div>
              <span style={{ fontSize:12, padding:'3px 10px', borderRadius:20, background:'rgba(255,255,255,.07)', color:'var(--text2)', border:'1px solid var(--border2)' }}>Last 30 events</span>
            </div>
            {logLoading ? (
              <div style={{ fontSize:13, color:'var(--text3)', padding:'16px 0', textAlign:'center' }}>Loading activity…</div>
            ) : privacyLog.length === 0 ? (
              <div style={{ fontSize:13, color:'var(--text3)', padding:'16px 0', textAlign:'center' }}>
                No privacy events yet. Bench views, matches, and stealth changes appear here.
              </div>
            ) : (
              <div>
                {privacyLog.map((event, i) => {
                  const { icon, text, color } = logDisplay(event);
                  return (
                    <div key={event.id || i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:i<privacyLog.length-1?'1px solid rgba(255,255,255,.05)':'none', fontSize:13 }}>
                      <span style={{ fontSize:16, flexShrink:0 }}>{icon}</span>
                      <span style={{ flex:1, color:color||'var(--text2)' }}>{text}</span>
                      <span style={{ fontSize:11, color:'var(--text3)', flexShrink:0 }}>{relativeTime(event.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
