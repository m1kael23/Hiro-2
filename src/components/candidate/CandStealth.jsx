import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

const openModes = [
  { id:'actively', icon:'🔥', label:'Actively looking', sub:'Surfaced first · fast-tracked', selClass:'green-sel',
    desc:'You appear at the top of employer searches. Hiro sends your profile to relevant roles daily. All mutual matches are fast-tracked.' },
  { id:'passive', icon:'👀', label:'Passively open', sub:'Discoverable · not promoted',
    desc:'Your profile is visible but not actively promoted. Employers can still find you in searches and reach out if you\'re a strong match.' },
  { id:'not', icon:'🔒', label:'Not looking', sub:'Hidden · matches paused',
    desc:'Your profile is hidden from all employer searches. Existing matches and conversations remain active, but no new matches will be created.' },
];

const visOptions = {
  name:     { label:'Your name',          sub:'Show full name or initials only',     opts:[{id:'full',lbl:'Full'},{id:'initials',lbl:'Initials'}],           init:'full' },
  employer: { label:'Current employer',   sub:'Hide where you work now',             opts:[{id:'visible',lbl:'Visible'},{id:'hidden',lbl:'Hidden'}],          init:'hidden' },
  salary:   { label:'Salary expectations',sub:'Who can see your target comp',        opts:[{id:'all',lbl:'All'},{id:'matches',lbl:'Matches'},{id:'hidden',lbl:'Hidden'}], init:'matches' },
  dna:      { label:'Work DNA card',      sub:'Your working style fingerprint',      opts:[{id:'all',lbl:'All'},{id:'matches',lbl:'Matches'},{id:'hidden',lbl:'Hidden'}], init:'all' },
  photo:    { label:'Profile photo',      sub:'Show or blur your photo',             opts:[{id:'visible',lbl:'Visible'},{id:'blurred',lbl:'Blurred'}],         init:'visible' },
};

const privacyLog = [
  { icon:'👁️', text:'Monzo viewed your profile', time:'2 hours ago', color:'var(--text2)' },
  { icon:'🔒', text:'Stealth mode activated', time:'3 hours ago', color:'var(--cyan)' },
  { icon:'👁️', text:'Synthesia viewed your profile', time:'Yesterday', color:'var(--text2)' },
  { icon:'🚫', text:'Blocked: Current Employer Ltd', time:'2 days ago', color:'var(--red)' },
  { icon:'👁️', text:'Revolut viewed your profile', time:'3 days ago', color:'var(--text2)' },
  { icon:'🔓', text:'Stealth mode deactivated', time:'1 week ago', color:'var(--text3)' },
];

export default function CandStealth() {
  const { showToast } = useApp();
  const { updateProfile } = useAuth();
  const { profile } = useAuth();
  const [stealth, setStealth] = useState(false);
  const [openMode, setOpenMode] = useState('actively');
  const [vis, setVis] = useState(Object.fromEntries(Object.entries(visOptions).map(([k,v])=>[k,v.init])));
  const [blockInput, setBlockInput] = useState('');
  const [blocked, setBlocked] = useState(['Current Employer Ltd']);

  function toggleStealth() {
    const next = !stealth;
    setStealth(next);
    updateProfile({ stealth_mode: next }).catch(console.error);
    showToast(next ? 'Stealth mode enabled — your current employer is now blocked' : 'Stealth mode disabled', next?'success':'default');
  }

  function addBlocked() {
    const val = blockInput.trim();
    if (!val) return;
    if (!blocked.includes(val)) setBlocked([...blocked, val]);
    setBlockInput('');
    showToast(`${val} blocked`, 'success');
  }

  function removeBlocked(name) {
    setBlocked(blocked.filter(b=>b!==name));
    showToast(`${name} unblocked`);
  }

  const curMode = openModes.find(m=>m.id===openMode);

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const fullName = profile?.full_name || 'Jordan Mitchell';

  // What employers see preview
  const vpName = vis.name==='full' ? fullName : fullName.split(' ')[0] + ' ' + fullName.split(' ').slice(1).map(n => n[0] + '.').join(' ');
  const vpEmployerTxt = vis.employer==='visible' ? `Current employer: ${profile?.company_name || 'Monzo'}` : 'Current employer hidden';
  const vpSalaryTxt = vis.salary==='all' ? 'Salary: £120k target' : vis.salary==='matches' ? 'Salary: matches only' : 'Salary hidden';
  const vpDnaTxt = vis.dna==='hidden' ? '🧬 DNA hidden' : '🧬 Work DNA visible · The Strategist';

  return (
    <div className="view-panel">
      <div className="scroll">
        <div className="stealth-shell">

          {/* Header */}
          <div className="page-hdr" style={{maxWidth:780,marginBottom:22}}>
            <div>
              <div className="eyebrow">Privacy controls</div>
              <div className="page-title">Stealth &amp; Visibility</div>
              <div className="page-sub">Your job search. Your rules. What employers see — and don&apos;t.</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>showToast('Privacy log exported','success')}>Export audit log</button>
          </div>

          {/* Stealth hero */}
          <div className="stealth-hero" style={{maxWidth:780,marginBottom:18}}>
            <div style={{display:'flex',gap:24,alignItems:'flex-start'}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}>
                  <span style={{fontSize:44}}>{stealth?'🔒':'🔓'}</span>
                  <div>
                    <div style={{fontFamily:'Manrope,sans-serif',fontSize:20,fontWeight:800,color:'#fff',marginBottom:4}}>Stealth mode</div>
                    <div style={{fontSize:14,color:'var(--text3)',lineHeight:1.5}}>
                      {stealth
                        ? 'Stealth on — your current employer cannot see your profile'
                        : 'Stealth off — your profile is fully visible to all employers on Hiro'}
                    </div>
                  </div>
                </div>
                <div className="stealth-toggle-row" onClick={toggleStealth} style={{maxWidth:520,cursor:'pointer'}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:'#fff',marginBottom:3}}>Enable stealth mode</div>
                    <div style={{fontSize:12,color:'var(--text3)'}}>Your current employer and their subsidiary companies cannot find or view your profile</div>
                  </div>
                  <label className="toggle-switch" onClick={e=>e.stopPropagation()}>
                    <input type="checkbox" checked={stealth} onChange={toggleStealth} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,flexShrink:0,width:274}}>
                {[
                  {val:'18',lbl:'Profile views\nthis week',color:'var(--cyan)'},
                  {val:blocked.length,lbl:'Employers\nblocked',color:'var(--amber)'},
                  {val:'47',lbl:'Active\nmatches',color:'var(--green)'},
                  {val:'0',lbl:'Visibility\nincidents',color:'var(--text2)'},
                ].map((s,i)=>(
                  <div key={i} className="stealth-stat">
                    <div className="stealth-stat-val" style={{color:s.color}}>{s.val}</div>
                    <div className="stealth-stat-lbl" style={{whiteSpace:'pre-line'}}>{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Open to opportunities */}
          <div className="card" style={{maxWidth:780,marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <div className="card-title" style={{marginBottom:0}}>Open to opportunities</div>
              <span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'rgba(108,71,255,.15)',color:'var(--violet)',border:'1px solid rgba(108,71,255,.3)'}}>Controls match surfacing</span>
            </div>
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:14}}>How actively Hiro shows you to employers. Affects how often your profile appears in searches and matches.</div>
            <div className="open-mode-grid">
              {openModes.map(m=>(
                <div
                  key={m.id}
                  className={`open-mode-btn${openMode===m.id?' selected'+(m.selClass?' '+m.selClass:''):''}`}
                  onClick={()=>{ setOpenMode(m.id); updateProfile({ open_mode: m.id }); showToast('Status updated: '+m.label,'success'); }}
                >
                  <div className="open-mode-icon">{m.icon}</div>
                  <div className="open-mode-label" style={openMode===m.id&&m.id==='actively'?{color:'var(--green)'}:{}}>{m.label}</div>
                  <div className="open-mode-sublabel">{m.sub}</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:12,padding:'12px 14px',borderRadius:'var(--r)',background:'rgba(255,255,255,.04)',border:'1px solid var(--border2)',fontSize:12,color:'var(--text2)',lineHeight:1.7}}>
              {curMode?.desc}
            </div>
          </div>

          {/* Visibility + preview/blocklist */}
          <div style={{maxWidth:780,display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>

            {/* Visibility controls */}
            <div className="card">
              <div className="card-title" style={{marginBottom:4}}>Visibility controls</div>
              <div style={{fontSize:12,color:'var(--text2)',marginBottom:14}}>Fine-tune exactly what each employer can see on your profile.</div>
              {Object.entries(visOptions).map(([key, opt], i) => (
                <div key={key} className="vis-row" style={i===Object.keys(visOptions).length-1?{borderBottom:'none'}:{}}>
                  <div>
                    <div className="vis-label">{opt.label}</div>
                    <div className="vis-sub">{opt.sub}</div>
                  </div>
                  <div className="vis-btns">
                    {opt.opts.map(o=>(
                      <button
                        key={o.id}
                        className={`vis-btn${vis[key]===o.id?' on':''}`}
                        onClick={()=>setVis({...vis,[key]:o.id})}
                      >
                        {o.lbl}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {/* Preview */}
              <div className="card">
                <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.14em',color:'var(--text3)',marginBottom:12}}>What employers see</div>
                <div style={{background:'rgba(255,255,255,.03)',border:'1px solid var(--border2)',borderRadius:'var(--r)',padding:14}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                    <div style={{width:38,height:38,borderRadius:11,background:'linear-gradient(135deg,#6c47ff,#a78bfa)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Manrope,sans-serif',fontSize:14,fontWeight:800,color:'#fff',flexShrink:0,filter:vis.photo==='blurred'?'blur(4px)':'none'}}>{getInitials(fullName)}</div>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,marginBottom:1}}>{vpName}</div>
                      <div style={{fontSize:12,color:'var(--text2)'}}>{profile?.job_title || 'Senior Product Manager'}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8}}>
                    <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'rgba(255,255,255,.07)',color:'var(--text3)',border:'1px solid var(--border2)'}}>{vpEmployerTxt}</span>
                    <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'rgba(255,255,255,.07)',color:'var(--text3)',border:'1px solid var(--border2)'}}>{vpSalaryTxt}</span>
                  </div>
                  <div style={{fontSize:12,color:'var(--text2)'}}>{vpDnaTxt}</div>
                </div>
              </div>

              {/* Blocklist */}
              <div className="card" style={{flex:1}}>
                <div className="card-title" style={{marginBottom:4}}>Employer block list</div>
                <div style={{fontSize:12,color:'var(--text2)',marginBottom:12}}>Blocked companies can never find, view or match with your profile — even if you score 99%.</div>
                <div style={{display:'flex',gap:8,marginBottom:8}}>
                  <input
                    className="inp"
                    placeholder="Type company name…"
                    style={{flex:1,fontSize:14}}
                    value={blockInput}
                    onChange={e=>setBlockInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter')addBlocked();}}
                  />
                  <button
                    onClick={addBlocked}
                    style={{padding:'0 14px',height:36,borderRadius:'var(--r)',background:'rgba(239,68,68,.15)',border:'1px solid rgba(239,68,68,.35)',color:'#f87171',fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}
                  >🚫 Block</button>
                </div>
                <div style={{fontSize:12,color:'var(--text3)',marginBottom:10}}>Tip: Block your current employer and their parent company to be safe.</div>
                <div>
                  {blocked.map(b=>(
                    <div key={b} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',background:'rgba(239,68,68,.07)',border:'1px solid rgba(239,68,68,.2)',borderRadius:'var(--r)',marginBottom:6,fontSize:13}}>
                      <span style={{flex:1,color:'var(--text)'}}>{b}</span>
                      <button
                        onClick={()=>removeBlocked(b)}
                        style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:16,lineHeight:1,padding:0}}
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Privacy log */}
          <div className="card" style={{maxWidth:780,marginBottom:24}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <div className="card-title" style={{marginBottom:0}}>Privacy activity log</div>
              <span style={{fontSize:12,padding:'3px 10px',borderRadius:20,background:'rgba(255,255,255,.07)',color:'var(--text2)',border:'1px solid var(--border2)'}}>Last 30 days</span>
            </div>
            <div>
              {privacyLog.map((l,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:i<privacyLog.length-1?'1px solid rgba(255,255,255,.05)':'none',fontSize:13}}>
                  <span style={{fontSize:16,flexShrink:0}}>{l.icon}</span>
                  <span style={{flex:1,color:l.color||'var(--text2)'}}>{l.text}</span>
                  <span style={{fontSize:11,color:'var(--text3)',flexShrink:0}}>{l.time}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
