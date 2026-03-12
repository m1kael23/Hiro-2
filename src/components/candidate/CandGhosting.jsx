import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';

// ── Score helpers ──────────────────────────────────────────────────────────────
function calcReliabilityScore(events) {
  let noShows = 0, noOfferReply = 0, silentWithdraw = 0, cleanProcesses = 0;
  let honoured = 0, total = 0;
  for (const e of events) {
    switch (e.type) {
      case 'interview_attended':  honoured++; total++; cleanProcesses++; break;
      case 'offer_responded':     honoured++; total++; break;
      case 'process_concluded':   honoured++; total++; cleanProcesses++; break;
      case 'vault_submitted':     cleanProcesses++; break;
      case 'no_show':             noShows++;  total++; break;
      case 'no_offer_reply':      noOfferReply++; total++; break;
      case 'silent_withdraw':     silentWithdraw++; total++; break;
      default: break;
    }
  }
  if (total === 0) {
    // New candidate — no events yet. Score is 70 (neutral).
    // Process transparency can still earn points via vault submissions.
    const vaultBonus = Math.min(30, cleanProcesses * 10);
    return 70 + vaultBonus;
  }
  const base = Math.round(100 * (honoured / total));
  return Math.max(20, Math.min(100, base - 15*noShows - 10*noOfferReply - 8*silentWithdraw + 2*cleanProcesses));
}

function getScoreColor(s) {
  if (s >= 90) return 'var(--green)';
  if (s >= 75) return 'var(--teal)';
  if (s >= 60) return '#38bdf8';
  if (s >= 45) return 'var(--amber)';
  return '#fb7185';
}
function getScoreLabel(s) {
  if (s >= 90) return 'Excellent';
  if (s >= 75) return 'Strong';
  if (s >= 60) return 'Good';
  if (s >= 45) return 'Fair';
  return 'At risk';
}
function getPercentile(s) {
  if (s >= 95) return 'Top 3%';
  if (s >= 90) return 'Top 8%';
  if (s >= 80) return 'Top 20%';
  if (s >= 70) return 'Top 35%';
  return 'Bottom 40%';
}

function eventToUI(e) {
  const map = {
    interview_attended: { color: 'var(--green)', label: 'Interview attended' },
    offer_responded:    { color: 'var(--green)', label: 'Offer responded to' },
    process_concluded:  { color: 'var(--green)', label: 'Process concluded professionally' },
    vault_submitted:    { color: '#38bdf8',      label: 'Vault report submitted' },
    no_show:            { color: '#fb7185',      label: 'Interview no-show' },
    no_offer_reply:     { color: 'var(--amber)', label: 'Offer not replied' },
    silent_withdraw:    { color: '#fb7185',      label: 'Silent withdrawal' },
  };
  return map[e.type] || { color: 'var(--text3)', label: e.type };
}

function fmtDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 30)  return `${diff} days ago`;
  const m = Math.floor(diff / 30);
  return `${m} month${m !== 1 ? 's' : ''} ago`;
}

function buildDims(events) {
  const noShows      = events.filter(e => e.type === 'no_show').length;
  const noReplies    = events.filter(e => e.type === 'no_offer_reply').length;
  const vaults       = events.filter(e => e.type === 'vault_submitted').length;
  const totalProc    = events.filter(e => ['interview_attended','process_concluded'].includes(e.type)).length || 1;
  const msgScore     = noShows === 0 ? 25 : Math.max(0, 25 - noShows * 8);
  const intScore     = noShows === 0 ? 25 : Math.max(0, 25 - noShows * 10);
  const offerScore   = noReplies === 0 ? 20 : Math.max(0, 20 - noReplies * 10);
  const vaultPct     = Math.min(1, vaults / totalProc);
  const procScore    = Math.round(vaultPct * 30);
  return [
    { id:'r1', icon:'ico-chat',    iconColor:'#a78bfa',         label:'Message responsiveness', score:`${msgScore}/25`,   scoreColor: msgScore>=20?'var(--green)':'var(--amber)',
      sub: noShows===0?'Responded to all mutual match messages within 7 days':`${noShows} late / missed response${noShows>1?'s':''} on record`,
      tip: noShows===0?'Full score. You responded to every employer message within 7 days. The Hiro threshold is 7 days — late responses start reducing this dimension.':`Score deducted for ${noShows} missed or late response${noShows>1?'s':''}. Respond to all messages within 7 days to protect this dimension.` },
    { id:'r2', icon:'ico-calendar', iconColor:'var(--text2)',   label:'Interview commitments',   score:`${intScore}/25`,   scoreColor: intScore>=20?'var(--green)':'#fb7185',
      sub: noShows===0?'No no-shows or same-day cancellations':`${noShows} no-show${noShows>1?'s':''} on record`,
      tip: noShows===0?'Full score. You attended every scheduled interview and gave at least 24 hours notice for any reschedules. This is one of the highest-weighted dimensions.':`Score deducted. No-shows are the hardest deduction to recover from. Give at least 24h notice for any reschedule.` },
    { id:'r3', icon:'ico-check',   iconColor:'var(--teal)',     label:'Offer follow-through',    score:`${offerScore}/20`, scoreColor: offerScore===20?'var(--green)':'var(--amber)',
      sub: offerScore===20?'No offer acceptances followed by withdrawals':'One or more offers not replied to within 7 days',
      tip: offerScore===20?'Full score. Withdrawing an accepted offer after a start date is set is one of the hardest deductions to recover from. Yours is clean.':'Reply to all offers within 7 days — even to decline. Silence triggers a deduction after 7 days.' },
    { id:'r4', icon:'ico-flash2',  iconColor:'#a78bfa',         label:'Process transparency',    score:`${procScore}/30`,  scoreColor: procScore>=25?'var(--green)':'var(--cyan)',
      sub: vaults===0?'No Vault reports submitted yet':`Submitted ${vaults} Vault report${vaults>1?'s':''} after completed processes`,
      tip: procScore<30?`Submitting Vault reports for completed processes would boost your score toward 100.`:'Full score. All processes have a Vault report submitted.',
      showVaultBtn: procScore < 30 },
  ];
}

export default function CandGhosting() {
  const { navigate } = useApp();
  const { profile }  = useAuth();
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [openTip, setOpenTip] = useState(null);

  useEffect(() => {
    if (!profile?.id) { setLoading(false); return; }
    async function load() {
      try {
        const q = query(
          collection(db, 'ghost_events'),
          where('candidateId', '==', profile.id),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const snap = await getDocs(q);
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('ghost_events fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile?.id]);

  // Always compute from live ghost_events — never use the stale onboarding default
  const score      = loading ? (profile?.reliability_score ?? 70) : calcReliabilityScore(events);
  const scoreColor = getScoreColor(score);
  const dims       = buildDims(events);

  const timeline = events.slice(0, 10).map(e => {
    const ui = eventToUI(e);
    return { color: ui.color, title: `${e.companyName || 'Employer'} · ${ui.label}`, sub: fmtDate(e.createdAt) + (e.note ? ` · ${e.note}` : '') };
  });

  const noShows      = events.filter(e => e.type === 'no_show').length;
  const pendingVault = events.filter(e => e.type === 'vault_pending').length > 0;
  const tips = [
    { done: noShows === 0,   text: 'Always respond to match messages within 7 days' },
    { done: noShows === 0,   text: 'Give 24h notice for any interview reschedule' },
    { done: !pendingVault,   text: 'Submit pending Vault report for completed processes', action: () => navigate('cand-vault') },
    { done: true,            text: 'Never withdraw an accepted offer after start date is set' },
  ];

  return (
    <div className="view">
      <div className="scroll">
        <div style={{ maxWidth: 820 }}>
          <div className="page-hdr" style={{ maxWidth: 820, marginBottom: 18 }}>
            <div>
              <div className="eyebrow">Your professional reputation</div>
              <div className="page-title">Reliability Score</div>
              <div className="page-sub">How you show up in the process. Visible to employers only after a mutual match.</div>
            </div>
          </div>

          {/* Score hero */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'start', marginBottom: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ position: 'relative', width: 88, height: 88 }}>
                <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="8" />
                  <circle cx="44" cy="44" r="36" fill="none" stroke={scoreColor} strokeWidth="8" strokeLinecap="round"
                    strokeDasharray="226" strokeDashoffset={String(Math.round(226 * (1 - score / 100)))}
                    style={{ transition: 'stroke-dashoffset .8s ease' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 24, fontWeight: 800, color: scoreColor }}>{score}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>/100</div>
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: scoreColor, marginTop: 6 }}>{getScoreLabel(score)}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{getPercentile(score)}</div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
                Last updated {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  [events.length > 0 ? `${Math.round(events.filter(e=>!['no_show','no_offer_reply','silent_withdraw'].includes(e.type)).length / events.length * 100)}%` : '—', events.length > 0 ? 'var(--green)' : 'var(--text3)', 'Response rate'],
                  [String(events.filter(e => e.type === 'no_show').length), events.filter(e => e.type === 'no_show').length === 0 ? 'var(--green)' : '#fb7185', 'Ghost flags'],
                  ['—', 'var(--text3)', 'Response speed'],
                ].map(([v, c, l]) => {
                  const rgb = c === 'var(--green)' ? '34,197,94' : c === '#fb7185' ? '248,113,133' : '90,91,114';
                  return (
                  <div key={l} style={{ padding:'9px 11px', borderRadius:'var(--r)', background:`rgba(${rgb},.07)`, border:`1px solid rgba(${rgb},.2)`, textAlign:'center' }}>
                    <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:20, fontWeight:800, color:c }}>{v}</div>
                    <div style={{ fontSize:10, color:'var(--text3)' }}>{l}</div>
                  </div>
                  );
                })}
              </div>
              <div style={{ padding:'10px 12px', borderRadius:'var(--r)', background:`rgba(${score>=75?'34,197,94':'245,158,11'},.07)`, border:`1px solid rgba(${score>=75?'34,197,94':'245,158,11'},.25)`, fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>
                {score >= 90
                  ? <>⚡ Your reliability score unlocks <strong style={{ color:'var(--green)' }}>2.3× faster employer responses</strong> and priority placement in employer searches on Hiro.</>
                  : score >= 75
                  ? <>⚡ Good standing. Keep attending interviews and responding to offers to push above 90 and unlock priority placement.</>
                  : <>⚠️ Your score is affecting match visibility. Address outstanding flags to recover your standing.</>
                }
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div className="card-title" style={{ marginBottom:0 }}>Score breakdown</div>
              <span style={{ fontSize:12, color:'var(--text3)' }}>Click any dimension to learn more</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {dims.map(d => (
                <div key={d.id}>
                  <div className="tip-item" onClick={() => setOpenTip(openTip===d.id?null:d.id)}
                    style={{ borderColor: d.scoreColor==='var(--green)'?'rgba(34,197,94,.2)':'rgba(56,189,248,.2)', cursor:'pointer' }}>
                    <span className={`ico ${d.icon}`} style={{ width:15, height:15, background:d.iconColor, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontWeight:700, color:d.scoreColor }}>{d.label}</span>
                        <span style={{ fontFamily:"'Manrope',sans-serif", fontWeight:800, color:d.scoreColor }}>{d.score}</span>
                      </div>
                      <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{d.sub}</div>
                    </div>
                  </div>
                  {openTip === d.id && (
                    <div style={{ padding:'9px 12px', borderRadius:'var(--r)', background:`rgba(${d.scoreColor==='var(--green)'?'34,197,94':'56,189,248'},.05)`, border:`1px solid rgba(${d.scoreColor==='var(--green)'?'34,197,94':'56,189,248'},.15)`, fontSize:12, color:'var(--text2)', marginTop:-4, lineHeight:1.65 }}>
                      {d.tip}
                      {d.showVaultBtn && <button className="btn btn-ghost btn-sm" style={{ marginTop:6 }} onClick={() => navigate('cand-vault')}>Submit pending report →</button>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Process history */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">Recent process history</div>
            {loading ? (
              <div style={{ fontSize:12, color:'var(--text3)', padding:'8px 0' }}>Loading history…</div>
            ) : timeline.length === 0 ? (
              <div style={{ fontSize:12, color:'var(--text3)', padding:'8px 0' }}>No history yet. Your commitment record will appear here as you engage with employers.</div>
            ) : (
              <div className="ghost-timeline">
                {timeline.map((item, i) => (
                  <div key={i} className="gt-item">
                    <div className="gt-dot-col">
                      <div className="gt-dot" style={{ background: item.color }} />
                      {i < timeline.length - 1 && <div className="gt-line" />}
                    </div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700 }}>{item.title}</div>
                      <div style={{ fontSize:12, color:'var(--text3)' }}>{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="card">
            <div className="card-title">Protect your score</div>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {tips.map((tip, i) => (
                <div key={i} className={`tip-item${tip.done?' done':''}`} onClick={tip.action} style={{ cursor: tip.action?'pointer':'default' }}>
                  {tip.done
                    ? <span className="ico ico-check" style={{ width:13, height:13, background:'var(--green)', flexShrink:0 }} />
                    : <span style={{ fontSize:14, flexShrink:0 }}>○</span>
                  }
                  <div>{tip.text}{!tip.done && tip.action && <span style={{ color:'var(--cyan)', cursor:'pointer' }}> → Submit now</span>}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
