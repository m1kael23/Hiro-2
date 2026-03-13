/**
 * ReferralHub — Hiro referral programme
 *
 * Firestore collection:  referrals/{userId}
 *   { userId, code, referralCount, rewardTier, createdAt }
 *
 * Users collection — new field:  referredBy: string (referral code)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, getDocs, doc, setDoc, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { db }           from '../../firebase';
import { useAuth }      from '../../context/AuthContext';
import { useApp }       from '../../context/AppContext';

/* ─── Reward tiers ────────────────────────────────────────────────── */
const TIERS = [
  { at: 1,  name: 'First referral', reward: '1 month free',        icon: '🎁', color: '#a78bfa' },
  { at: 3,  name: 'Connector',      reward: '3 months free',       icon: '🔗', color: 'var(--cyan)' },
  { at: 5,  name: 'Ambassador',     reward: 'Lifetime 20% off',    icon: '⭐', color: '#f59e0b' },
  { at: 10, name: 'Hiro Legend',    reward: '1 year free + badge', icon: '👑', color: 'var(--green)' },
];

/* ─── Deterministic referral code from userId ─────────────────────── */
function makeCode(uid) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'HR-';
  for (let i = 0; i < 5; i++) out += chars[parseInt(uid.slice(i * 2, i * 2 + 2), 16) % chars.length];
  return out;
}

function copyText(text, showToast) {
  navigator.clipboard?.writeText(text)
    .then(() => showToast('Copied ✓', 'success'))
    .catch(() => {
      const el = Object.assign(document.createElement('textarea'), { value: text });
      document.body.appendChild(el); el.select(); document.execCommand('copy');
      document.body.removeChild(el); showToast('Copied ✓', 'success');
    });
}

/* ─── ShareCard ───────────────────────────────────────────────────── */
function ShareCard({ code, link, mode, showToast }) {
  const [tab, setTab] = useState('link');

  const emailBody = mode === 'candidate'
    ? `Hey! I've been using Hiro to find my next role — it matches you by how you actually work, not just your CV. Employers can't ghost you either. Use my link and skip the queue:\n\n${link}`
    : `Hey! We've been using Hiro to hire and it's cut our time-to-hire significantly. Work DNA™ matching means we only speak to people who'll genuinely fit. Try it free:\n\n${link}`;

  const liMsg = `I've been using @HiroTalent — the Work DNA™ matching is unlike anything else. ${link} #HireSmarter`;

  const content = { link, code, email: emailBody, linkedin: liMsg };
  const isMono  = tab === 'link' || tab === 'code';

  return (
    <div className="card">
      <div className="card-title">Share your referral link</div>
      <div className="card-sub">Every person who signs up earns you rewards — no cap on referrals.</div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        {[['link', '🔗 Link'], ['code', '# Code'], ['email', '✉ Email'], ['linkedin', 'in LinkedIn']].map(([k, l]) => (
          <button key={k} className={`btn btn-sm ${tab === k ? 'btn-violet' : 'btn-ghost'}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div style={{
        background: 'rgba(0,0,0,.2)', border: '1px solid var(--border)',
        borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 10,
        fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, wordBreak: 'break-all',
        fontFamily: isMono ? 'monospace' : 'inherit',
        maxHeight: isMono ? 'auto' : 140, overflowY: 'auto',
      }}>
        {content[tab]}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-violet btn-sm" style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => copyText(content[tab], showToast)}>
          Copy {tab === 'code' ? 'code' : tab === 'link' ? 'link' : 'message'}
        </button>
        {tab === 'linkedin' && (
          <button className="btn btn-ghost btn-sm"
            onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`, '_blank')}>
            Open LinkedIn ↗
          </button>
        )}
        {tab === 'email' && (
          <button className="btn btn-ghost btn-sm"
            onClick={() => window.open(`mailto:?subject=Try Hiro&body=${encodeURIComponent(emailBody)}`, '_blank')}>
            Open Mail ↗
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Progress tracker ────────────────────────────────────────────── */
function Progress({ count }) {
  const current = [...TIERS].reverse().find(t => t.at <= count);
  const next    = TIERS.find(t => t.at > count);

  return (
    <div className="card">
      <div className="card-title">Reward progress</div>

      {current && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 'var(--r)', marginBottom: 16, background: `${current.color}12`, border: `1px solid ${current.color}33` }}>
          <span style={{ fontSize: 22 }}>{current.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: current.color }}>{current.name} — unlocked</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{current.reward}</div>
          </div>
        </div>
      )}

      {TIERS.map((tier, i) => {
        const unlocked = count >= tier.at;
        const isNext   = tier === next;
        const pct      = isNext ? Math.round((count / tier.at) * 100) : unlocked ? 100 : 0;
        return (
          <div key={i} style={{ marginBottom: 12, opacity: unlocked || isNext ? 1 : 0.4 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 18, minWidth: 24, lineHeight: 1.4 }}>{tier.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: unlocked ? tier.color : 'var(--text2)' }}>
                    {tier.name}{unlocked ? ' ✓' : ''}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{tier.at} ref · {tier.reward}</span>
                </div>
                <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,.07)' }}>
                  <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: unlocked ? tier.color : `${tier.color}88`, transition: 'width .5s ease' }} />
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {next && (
        <div style={{ marginTop: 6, padding: '10px 14px', borderRadius: 'var(--r)', background: 'rgba(108,71,255,.08)', border: '1px solid rgba(108,71,255,.2)', fontSize: 12, color: 'var(--text2)' }}>
          {next.at - count} more referral{next.at - count > 1 ? 's' : ''} until <strong style={{ color: next.color }}>{next.name}</strong> — {next.reward}
        </div>
      )}
    </div>
  );
}

/* ─── Referral list ───────────────────────────────────────────────── */
function ReferralList({ list }) {
  if (!list.length) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🔗</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>No referrals yet</div>
        <div style={{ fontSize: 13, color: 'var(--text3)' }}>Share your link above to start earning rewards.</div>
      </div>
    );
  }
  const sc = { signed_up: 'var(--cyan)', active: 'var(--green)', rewarded: '#f59e0b' };
  return (
    <div className="card">
      <div className="card-title">Your referrals ({list.length})</div>
      {list.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < list.length - 1 ? '1px solid var(--border)' : 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(108,71,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--violet)' }}>
            {(r.name || r.email || '?').slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{r.name || r.email || 'Anonymous'}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.mode || 'User'} · {r.joinedAt?.seconds ? new Date(r.joinedAt.seconds * 1000).toLocaleDateString() : 'Recently'}</div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '.07em', background: `${sc[r.status] || 'rgba(255,255,255,.08)'}22`, color: sc[r.status] || 'var(--text3)' }}>
            {r.status || 'signed up'}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Leaderboard ─────────────────────────────────────────────────── */
function Leaderboard({ board, myId }) {
  const medals = ['🥇', '🥈', '🥉'];
  const NAMES  = ['Alex', 'Sam', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Quinn', 'Avery', 'Drew', 'Blake'];
  const myRank = board.findIndex(r => r.userId === myId);

  if (!board.length) return null;

  return (
    <div className="card">
      <div className="card-title">Top referrers this month</div>
      <div className="card-sub">Names are anonymised for privacy.</div>
      {board.slice(0, 10).map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 'var(--r)', marginBottom: 5, background: i < 3 ? 'rgba(108,71,255,.06)' : 'rgba(255,255,255,.02)', border: `1px solid ${i < 3 ? 'rgba(108,71,255,.2)' : 'var(--border)'}` }}>
          <span style={{ fontSize: 18, minWidth: 24 }}>{medals[i] || `#${i + 1}`}</span>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            {r.userId === myId ? 'You' : `${NAMES[i] || 'User'} ${r.code?.slice(-3) || ''}`}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Manrope,sans-serif', color: 'var(--violet)' }}>{r.referralCount}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>referrals</div>
          </div>
        </div>
      ))}
      {myRank > 2 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 'var(--r)', marginTop: 4, background: 'rgba(108,71,255,.08)', border: '1px solid rgba(108,71,255,.3)' }}>
          <span style={{ fontSize: 16, minWidth: 24, color: 'var(--violet)', fontWeight: 700 }}>#{myRank + 1}</span>
          <div style={{ flex: 1, fontSize: 13, color: 'var(--violet)', fontWeight: 600 }}>You</div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════════════ */
export default function ReferralHub() {
  const { profile }    = useAuth();
  const { showToast }  = useApp();
  const [data,    setData]    = useState(null);
  const [list,    setList]    = useState([]);
  const [board,   setBoard]   = useState([]);
  const [loading, setLoading] = useState(true);

  const uid  = profile?.id;
  const code = uid ? makeCode(uid) : '';
  const link = `https://hiro.so/join?ref=${code}`;

  /* ── Ensure referral doc exists & subscribe ─────────────────────── */
  useEffect(() => {
    if (!uid) return;
    const refDoc = doc(db, 'referrals', uid);
    const unsub  = onSnapshot(refDoc, async snap => {
      if (!snap.exists()) {
        await setDoc(refDoc, { userId: uid, code, referralCount: 0, rewardTier: null, createdAt: serverTimestamp() });
      } else {
        setData(snap.data());
      }
    }, () => setLoading(false));
    return () => unsub();
  }, [uid, code]);

  /* ── Subscribe to referred users ────────────────────────────────── */
  useEffect(() => {
    if (!code) return;
    const q    = query(collection(db, 'users'), where('referredBy', '==', code));
    const unsub = onSnapshot(q, snap => {
      setList(snap.docs.map(d => ({
        id:       d.id,
        name:     d.data().full_name,
        email:    d.data().email,
        mode:     d.data().mode,
        joinedAt: d.data().createdAt,
        status:   'signed_up',
      })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [code]);

  /* ── Leaderboard ────────────────────────────────────────────────── */
  useEffect(() => {
    getDocs(query(collection(db, 'referrals'), where('referralCount', '>', 0)))
      .then(snap => setBoard(snap.docs.map(d => d.data()).sort((a, b) => (b.referralCount || 0) - (a.referralCount || 0))))
      .catch(() => {});
  }, []);

  const count = data?.referralCount || list.length;

  if (loading) return (
    <div className="view-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
      Loading referral data…
    </div>
  );

  return (
    <div className="view-panel">
      <div className="scroll">

        <div className="page-hdr" style={{ maxWidth: 780 }}>
          <div>
            <div className="eyebrow">Grow the community</div>
            <div className="page-title">Refer &amp; Earn</div>
            <div className="page-sub">Invite friends and colleagues. Every signup earns rewards — no cap.</div>
          </div>
          {/* Live referral count badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 'var(--r)', background: 'rgba(108,71,255,.12)', border: '1px solid rgba(108,71,255,.3)' }}>
            <span style={{ fontSize: 22 }}>🔗</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Manrope,sans-serif', color: 'var(--violet)', lineHeight: 1 }}>{count}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>referrals</div>
            </div>
          </div>
        </div>

        <div className="g2" style={{ maxWidth: 780 }}>
          <div>
            <ShareCard code={code} link={link} mode={profile?.mode} showToast={showToast} />
            <ReferralList list={list} />
          </div>
          <div>
            <Progress count={count} />
            <Leaderboard board={board} myId={uid} />
          </div>
        </div>
      </div>
    </div>
  );
}
