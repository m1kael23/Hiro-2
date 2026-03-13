/**
 * AdminPanel — Hiro internal operations dashboard
 *
 * Access:  profile.mode === 'admin'  OR  email === 'helio.silva1961@gmail.com'
 * Tabs:    Overview | Users | Jobs | Matches | Engine
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, getDocs, doc, updateDoc,
  orderBy, limit, getCountFromServer, serverTimestamp,
} from 'firebase/firestore';
import { db }           from '../../firebase';
import { useAuth }      from '../../context/AuthContext';
import { useApp }       from '../../context/AppContext';
import { recomputeAllMatches } from '../../lib/matchingEngine';

/* ─── Shared atoms ────────────────────────────────────────────────── */
function Kpi({ label, value, sub, color = 'var(--violet)' }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px 20px' }}>
      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Manrope,sans-serif', color, lineHeight: 1 }}>{value ?? '…'}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Tag({ children, color = 'var(--text3)', bg = 'rgba(255,255,255,.07)' }) {
  return (
    <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: bg, color, textTransform: 'uppercase', letterSpacing: '.08em' }}>
      {children}
    </span>
  );
}

function SL({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text3)', margin: '22px 0 8px' }}>{children}</div>;
}

/* ─── Overview ────────────────────────────────────────────────────── */
function TabOverview({ stats, activity }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(148px,1fr))', gap: 10, marginBottom: 24 }}>
        <Kpi label="Total users"      value={stats.users}    sub={`${stats.employers ?? '…'} emp · ${stats.candidates ?? '…'} cand`} color="var(--violet)" />
        <Kpi label="Live jobs"        value={stats.liveJobs} sub="Published"          color="var(--cyan)" />
        <Kpi label="Match docs"       value={stats.matches}  sub="Applications"       color="var(--green)" />
        <Kpi label="Mutual matches"   value={stats.mutual}   sub="Both parties keen"  color="#f59e0b" />
        <Kpi label="Threads"          value={stats.threads}  sub="Active convos"      color="#ec4899" />
        <Kpi label="Avg match score"  value={stats.avgMatch != null ? `${stats.avgMatch}%` : '…'} sub="Platform avg" color="var(--cyan)" />
      </div>
      <SL>Recent activity</SL>
      {activity.length === 0
        ? <div style={{ fontSize: 13, color: 'var(--text3)', padding: '20px 0' }}>No recent activity loaded.</div>
        : activity.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 'var(--r)', marginBottom: 6, background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 18 }}>{a.icon}</span>
            <div style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>
              {a.text}
              {a.sub && <span style={{ color: 'var(--text3)', marginLeft: 8, fontSize: 11 }}>{a.sub}</span>}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{a.time}</span>
          </div>
        ))
      }
    </>
  );
}

/* ─── Users ───────────────────────────────────────────────────────── */
function TabUsers({ users, onRole, onImpersonate }) {
  const [filter, setFilter] = useState('all');
  const [q,      setQ]      = useState('');
  const [saving, setSaving] = useState(null);

  const modeColor = { employer: 'var(--cyan)', candidate: 'var(--violet)', admin: '#f59e0b' };

  const rows = users.filter(u => {
    if (filter !== 'all' && u.mode !== filter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return (u.full_name || '').toLowerCase().includes(s)
      || (u.email || '').toLowerCase().includes(s)
      || (u.company_name || '').toLowerCase().includes(s);
  });

  async function changeRole(uid, mode) {
    setSaving(uid); await onRole(uid, mode); setSaving(null);
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input className="inp" style={{ flex: 1, minWidth: 200 }} placeholder="Search name / email / company…"
          value={q} onChange={e => setQ(e.target.value)} />
        {['all', 'employer', 'candidate', 'admin'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-violet' : 'btn-ghost'}`} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>{rows.length} users</div>
      {rows.map(u => (
        <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: 12, marginBottom: 6, padding: '12px 16px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: `${modeColor[u.mode] || 'rgba(255,255,255,.1)'}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: modeColor[u.mode] || 'var(--text2)' }}>
              {(u.full_name || u.email || '?').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{u.full_name || '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{u.email} · {u.company_name || u.job_title || ''}</div>
            </div>
          </div>
          <Tag color={modeColor[u.mode] || 'var(--text3)'} bg={`${modeColor[u.mode] || 'rgba(255,255,255,.1)'}22`}>{u.mode || '?'}</Tag>
          <select className="sel" style={{ fontSize: 12, padding: '4px 8px' }}
            value={u.mode || 'candidate'} onChange={e => changeRole(u.id, e.target.value)} disabled={saving === u.id}>
            <option value="candidate">Candidate</option>
            <option value="employer">Employer</option>
            <option value="admin">Admin</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => onImpersonate(u)}>View →</button>
        </div>
      ))}
      {rows.length === 0 && <div style={{ fontSize: 13, color: 'var(--text3)', padding: '20px 0', textAlign: 'center' }}>No users match.</div>}
    </>
  );
}

/* ─── Jobs ────────────────────────────────────────────────────────── */
function TabJobs({ jobs, onToggle }) {
  const [filter, setFilter] = useState('all');
  const sc = { live: 'var(--green)', draft: 'var(--text3)', paused: '#f59e0b', closed: '#fb7185' };
  const rows = jobs.filter(j => filter === 'all' || j.status === filter);
  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {['all', 'live', 'draft', 'paused', 'closed'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-violet' : 'btn-ghost'}`} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>{rows.length} jobs</div>
      {rows.map(j => (
        <div key={j.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 12, marginBottom: 6, padding: '12px 16px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
              {j.title || 'Untitled'}
              <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text3)' }}>@ {j.companyName || j.employerId?.slice(0, 8)}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{j.location || 'Remote'} · £{j.salMin}–{j.salMax}k</div>
          </div>
          <Tag color={sc[j.status] || 'var(--text3)'} bg={`${sc[j.status] || 'rgba(255,255,255,.1)'}22`}>{j.status}</Tag>
          <button className="btn btn-ghost btn-sm" onClick={() => onToggle(j.id, j.status)}>
            {j.status === 'live' ? 'Pause' : 'Go live'}
          </button>
        </div>
      ))}
    </>
  );
}

/* ─── Matches ─────────────────────────────────────────────────────── */
function TabMatches({ matches }) {
  const mutual  = matches.filter(m => m.candidateExpressedInterest && m.employerExpressedInterest);
  const pending = matches.filter(m => m.candidateExpressedInterest && !m.employerExpressedInterest);
  const sc      = s => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--cyan)' : '#f59e0b';
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
        <Kpi label="Total"             value={matches.length} color="var(--violet)" />
        <Kpi label="Mutual"            value={mutual.length}  sub={`${matches.length ? Math.round(mutual.length / matches.length * 100) : 0}% rate`} color="var(--green)" />
        <Kpi label="Awaiting employer" value={pending.length} color="#f59e0b" />
      </div>
      <SL>Latest 50 match docs</SL>
      {matches.slice(0, 50).map(m => (
        <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: 10, marginBottom: 5, padding: '9px 14px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)', fontSize: 12 }}>
          <div>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{m.candidateId?.slice(0, 10)}…</span>
            <span style={{ color: 'var(--text3)', margin: '0 6px' }}>→</span>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{m.jobId?.slice(0, 10)}…</span>
          </div>
          <span style={{ fontWeight: 700, color: sc(m.matchScore) }}>{m.matchScore ?? '?'}%</span>
          <Tag
            color={m.candidateExpressedInterest && m.employerExpressedInterest ? 'var(--green)' : 'var(--text3)'}
            bg={m.candidateExpressedInterest && m.employerExpressedInterest ? 'rgba(34,197,94,.12)' : 'rgba(255,255,255,.06)'}>
            {m.candidateExpressedInterest && m.employerExpressedInterest ? 'mutual' : m.candidateExpressedInterest ? 'cand →' : 'matched'}
          </Tag>
          <span style={{ color: 'var(--text3)' }}>{m.stage}</span>
        </div>
      ))}
    </>
  );
}

/* ─── Engine ──────────────────────────────────────────────────────── */
function TabEngine({ showToast }) {
  const [running, setRunning] = useState(false);
  const [result,  setResult]  = useState(null);
  const [log,     setLog]     = useState([]);
  const logColors = { info: 'var(--text2)', success: 'var(--green)', error: '#fb7185', warn: '#f59e0b' };
  const addLog = (msg, type = 'info') =>
    setLog(p => [{ msg, color: logColors[type], ts: new Date().toLocaleTimeString() }, ...p].slice(0, 60));

  async function runRecompute() {
    if (running) return;
    setRunning(true); setResult(null);
    addLog('Starting full match recompute…');
    try {
      const res = await recomputeAllMatches();
      setResult(res);
      addLog(`Done — ${res.created} written, ${res.skipped} skipped`, 'success');
      showToast('Recompute complete ✓', 'success');
    } catch (e) {
      addLog(`Error: ${e.message}`, 'error');
      showToast('Recompute failed', 'error');
    } finally { setRunning(false); }
  }

  return (
    <>
      <SL>Controls</SL>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div className="card">
          <div className="card-title">Full match recompute</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, lineHeight: 1.6 }}>
            Rescores every candidate × live job pair. Preserves all interest flags. Run after DNA engine changes.
          </div>
          <button className={`btn btn-sm ${running ? 'btn-ghost' : 'btn-violet'}`} onClick={runRecompute} disabled={running}>
            {running ? '⏳ Running…' : '▶ Run recompute'}
          </button>
          {result && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--green)' }}>✓ {result.created} written · {result.skipped} skipped</div>}
        </div>
        <div className="card">
          <div className="card-title">Clean stale matches</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, lineHeight: 1.6 }}>
            Removes match docs below the 40-point threshold. Safe to run any time.
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { addLog('Stale clean queued (implement as Cloud Function)', 'warn'); showToast('Queued', 'default'); }}>
            🧹 Clean stale
          </button>
        </div>
      </div>
      <SL>Console</SL>
      <div style={{ background: 'rgba(0,0,0,.3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, maxHeight: 320, overflowY: 'auto' }}>
        {log.length === 0
          ? <span style={{ color: 'var(--text3)' }}>No entries — run an action above.</span>
          : log.map((e, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <span style={{ color: 'var(--text3)', marginRight: 10 }}>{e.ts}</span>
              <span style={{ color: e.color }}>{e.msg}</span>
            </div>
          ))}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════════════ */
const TABS = ['Overview', 'Users', 'Jobs', 'Matches', 'Engine'];

export default function AdminPanel() {
  const { profile }    = useAuth();
  const { showToast }  = useApp();
  const [tab,      setTab]      = useState('Overview');
  const [loading,  setLoading]  = useState(true);
  const [stats,    setStats]    = useState({});
  const [users,    setUsers]    = useState([]);
  const [jobs,     setJobs]     = useState([]);
  const [matches,  setMatches]  = useState([]);
  const [activity, setActivity] = useState([]);

  const isAdmin = profile?.mode === 'admin' || profile?.email === 'helio.silva1961@gmail.com';

  const loadAll = useCallback(async () => {
    try {
      const [uC, jC, aC, mC, tC, eC, cC] = await Promise.all([
        getCountFromServer(collection(db, 'users')),
        getCountFromServer(query(collection(db, 'jobs'), where('status', '==', 'live'))),
        getCountFromServer(collection(db, 'applications')),
        getCountFromServer(query(collection(db, 'applications'),
          where('candidateExpressedInterest', '==', true),
          where('employerExpressedInterest',  '==', true))),
        getCountFromServer(collection(db, 'threads')),
        getCountFromServer(query(collection(db, 'users'), where('mode', '==', 'employer'))),
        getCountFromServer(query(collection(db, 'users'), where('mode', '==', 'candidate'))),
      ]);

      const sample = await getDocs(query(collection(db, 'applications'), orderBy('updatedAt', 'desc'), limit(100)));
      const scores = sample.docs.map(d => d.data().matchScore).filter(Boolean);
      const avgMatch = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

      setStats({
        users: uC.data().count, employers: eC.data().count, candidates: cC.data().count,
        liveJobs: jC.data().count, matches: aC.data().count, mutual: mC.data().count,
        threads: tC.data().count, avgMatch,
      });

      const [uS, jS, aS] = await Promise.all([
        getDocs(query(collection(db, 'users'),        orderBy('createdAt', 'desc'), limit(200))),
        getDocs(query(collection(db, 'jobs'),          orderBy('createdAt', 'desc'), limit(100))),
        getDocs(query(collection(db, 'applications'), orderBy('updatedAt', 'desc'), limit(200))),
      ]);

      setUsers(uS.docs.map(d => ({ id: d.id, ...d.data() })));
      setJobs(jS.docs.map(d => ({ id: d.id, ...d.data() })));
      setMatches(aS.docs.map(d => ({ id: d.id, ...d.data() })));

      // Build activity feed
      const feed = [];
      uS.docs.slice(0, 6).forEach(d => {
        const u = d.data(); const ts = u.createdAt?.toDate?.();
        feed.push({ icon: u.mode === 'employer' ? '🏢' : '👤', text: `${u.full_name || u.email} joined as ${u.mode}`, sub: u.company_name || u.job_title || '', time: ts ? ts.toLocaleDateString() : 'recently', sort: ts || new Date(0) });
      });
      aS.docs.filter(d => d.data().candidateExpressedInterest && d.data().employerExpressedInterest).slice(0, 6).forEach(d => {
        const m = d.data(); const ts = m.updatedAt?.toDate?.();
        feed.push({ icon: '🤝', text: `Mutual match — score ${m.matchScore}%`, sub: `DNA ${m.dnaScore}%`, time: ts ? ts.toLocaleDateString() : 'recently', sort: ts || new Date(0) });
      });
      feed.sort((a, b) => b.sort - a.sort);
      setActivity(feed.slice(0, 14));
    } catch (e) {
      console.error('AdminPanel loadAll error:', e);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isAdmin) loadAll(); else setLoading(false); }, [isAdmin, loadAll]);

  async function handleRole(uid, mode) {
    await updateDoc(doc(db, 'users', uid), { mode, updatedAt: serverTimestamp() });
    setUsers(p => p.map(u => u.id === uid ? { ...u, mode } : u));
    showToast(`User mode → ${mode}`, 'success');
  }

  async function handleToggleJob(id, status) {
    const next = status === 'live' ? 'paused' : 'live';
    await updateDoc(doc(db, 'jobs', id), { status: next });
    setJobs(p => p.map(j => j.id === id ? { ...j, status: next } : j));
    showToast(`Job ${next === 'live' ? 'published' : 'paused'}`, 'success');
  }

  /* ── access denied ──────────────────────────────────────────────── */
  if (!isAdmin) return (
    <div className="view-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, color: 'var(--text3)' }}>
      <span style={{ fontSize: 48 }}>🔒</span>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Admin access only</div>
      <div style={{ fontSize: 14 }}>Your account doesn't have admin privileges.</div>
    </div>
  );

  if (loading) return (
    <div className="view-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
      Loading admin data…
    </div>
  );

  return (
    <div className="view-panel">
      <div className="scroll">
        <div className="page-hdr" style={{ maxWidth: 1000 }}>
          <div>
            <div className="eyebrow">Hiro team · internal</div>
            <div className="page-title">Admin Panel</div>
            <div className="page-sub">{stats.users} users · {stats.liveJobs} live jobs · {stats.matches} match docs</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { setLoading(true); loadAll(); }}>↻ Refresh</button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 18px', fontSize: 13, fontWeight: tab === t ? 700 : 500,
              color: tab === t ? 'var(--violet)' : 'var(--text3)',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === t ? '2px solid var(--violet)' : '2px solid transparent',
              marginBottom: -1, transition: 'all .15s', fontFamily: 'Inter, sans-serif',
            }}>{t}</button>
          ))}
        </div>

        <div style={{ maxWidth: 1000 }}>
          {tab === 'Overview' && <TabOverview stats={stats} activity={activity} />}
          {tab === 'Users'    && <TabUsers    users={users}   onRole={handleRole}     onImpersonate={u => showToast(`View-as: ${u.full_name || u.email} (read-only)`, 'default')} />}
          {tab === 'Jobs'     && <TabJobs     jobs={jobs}     onToggle={handleToggleJob} />}
          {tab === 'Matches'  && <TabMatches  matches={matches} />}
          {tab === 'Engine'   && <TabEngine   showToast={showToast} />}
        </div>
      </div>
    </div>
  );
}
