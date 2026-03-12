import { getScoreColour } from '../../lib/matchStore';

import { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getGeminiClient } from "../../services/geminiService";
import { db, auth } from '../../firebase';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { fanOutJobMatches } from '../../lib/matchingEngine';

export default function EmpCreateJob() {
  const { navigate, showToast } = useApp();
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [matchStats, setMatchStats] = useState({ count: null, avgDna: null, publishedTitle: '' });
  const [isGeneratingSkills, setIsGeneratingSkills] = useState(false);
  const [suggestedSkills, setSuggestedSkills] = useState([]);
  const [title, setTitle] = useState('Senior Product Manager');
  const [dept, setDept] = useState('Product');
  const [location, setLocation] = useState('London, UK');
  const [remote, setRemote] = useState('Hybrid · 2 days');
  const [seniority, setSeniority] = useState('Senior');
  const [reloc, setReloc] = useState('None');
  const [currency, setCurrency] = useState('£');
  const [salMin, setSalMin] = useState('');
  const [salMax, setSalMax] = useState('');
  const [bonus, setBonus] = useState('');
  const [outcome6m, setOutcome6m] = useState('');
  const [outcome12m, setOutcome12m] = useState('');
  const [challenge, setChallenge] = useState('');
  const [mustSkills, setMustSkills] = useState(['Payments', 'Product strategy']);
  const [skillInput, setSkillInput] = useState('');
  const [expYears, setExpYears] = useState('5+ years');
  const [equityMin, setEquityMin] = useState('');
  const [equityMax] = useState('');
  const [cliffVest, setCliffVest] = useState('1yr cliff / 4yr vest');
  const [perks, setPerks] = useState({ health: true, ld: true, parental: false, pto: false, homeoffice: true, gym: false });
  const [customPerks, setCustomPerks] = useState([]);
  const [perkInput, setPerkInput] = useState('');

  async function generateSkills() {
    if (!title) {
      showToast('Please enter a job title first', 'error');
      return;
    }
    setIsGeneratingSkills(true);
    try {
      const ai = getGeminiClient(); if (!ai) return;
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Suggest 6 relevant professional skills for a "${title}" role in the "${dept}" department. Return only a comma-separated list of skills.`,
      });
      const skills = response.text.split(',').map(s => s.trim()).filter(s => s && !mustSkills.includes(s));
      setSuggestedSkills(skills);
    } catch (error) {
      console.error('Error generating skills:', error);
      showToast('Failed to generate suggestions', 'error');
    } finally {
      setIsGeneratingSkills(false);
    }
  }

  async function publishRole() {
    if (!auth.currentUser) {
      showToast('You must be logged in to publish a role', 'error');
      return;
    }

    setLoading(true);
    try {
      const jobId = `job_${Date.now()}`;
      const jobData = {
        id: jobId,
        employerId: auth.currentUser.uid,
        companyName: profile?.company_name || 'Monzo',
        title,
        department: dept,
        location,
        remote,
        seniority,
        relocation: reloc,
        currency,
        salMin: parseInt(salMin.replace(/[^0-9]/g, '')) || 90,
        salMax: parseInt(salMax.replace(/[^0-9]/g, '')) || 120,
        bonus,
        outcome6m,
        outcome12m,
        challenge,
        mustSkills,
        skillsRequired: mustSkills,
        skillsNice: ['SQL', 'OKRs'], // Default nice-to-haves
        dnaPrefs: [30, 20, 40, 25, 35, 55, 50], // Default DNA prefs matching the preview
        experienceYears: expYears,
        equityMin,
        equityMax,
        cliffVest,
        perks,
        customPerks,
        status: 'live',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        emoji: '🚀', // Default emoji
        daysLive: 0,
        responseRate: 100,
        avgDays: 14,
        dnaMembers: '1 member ✓',
        outcome: outcome6m || `Own the ${title} roadmap and drive impact.`,
      };

      await setDoc(doc(db, 'jobs', jobId), jobData);
      setMatchStats({ count: null, avgDna: null, publishedTitle: title });
      setPublished(true);
      showToast('Role published — computing candidate matches…', 'success');

      // Fan out: score all existing candidates against this new job
      fanOutJobMatches(jobData).then(({ created, avgDna }) => {
        setMatchStats({ count: created, avgDna: avgDna || null, publishedTitle: title });
        if (created > 0) {
          showToast(`${created} candidate match${created !== 1 ? 'es' : ''} computed 🧬`, 'success');
        }
      });
    } catch (error) {
      console.error('Error publishing job:', error);
      showToast('Failed to publish role. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }
  function resetForm() {
    setPublished(false);
    setStep(1);
  }

  const PIP_LABELS = ['1 · Basics', '2 · Comp', '3 · Outcome', '4 · Skills', '5 · DNA', '6 · Equity'];

  if (published) {
    const isComputing = matchStats.count === null;
    const dnaCol = matchStats.avgDna ? getScoreColour(matchStats.avgDna) : '#ec4899';
    return (
      <div className="view" style={{ overflow: 'hidden' }}>
        <div className="publish-success show">
          <div style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'dnaFloat 2s ease-in-out infinite', fontSize: 48 }}>🚀</div>
          <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em' }}>Role published!</div>
          <div style={{ fontSize: 14, color: 'var(--text2)', maxWidth: 340, lineHeight: 1.7 }}>
            <strong style={{ color: '#a78bfa' }}>{matchStats.publishedTitle || title}</strong> is now live.<br />
            {isComputing ? 'Hiro is matching candidates…' : 'Hiro matched candidates in real-time.'}
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', padding: '14px 20px', borderRadius: 'var(--rl)', border: '1px solid rgba(108,71,255,.25)', background: 'rgba(108,71,255,.08)', minWidth: 130 }}>
              {isComputing
                ? <div style={{ fontSize: 13, color: 'var(--text3)', padding: '8px 0' }}>Computing…</div>
                : <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 32, fontWeight: 800, color: '#a78bfa' }}>{matchStats.count}</div>
              }
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Candidates matched</div>
            </div>
            <div style={{ textAlign: 'center', padding: '14px 20px', borderRadius: 'var(--rl)', border: `1px solid ${dnaCol}40`, background: `${dnaCol}10`, minWidth: 130 }}>
              {isComputing
                ? <div style={{ fontSize: 13, color: 'var(--text3)', padding: '8px 0' }}>Computing…</div>
                : <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 32, fontWeight: 800, color: dnaCol }}>{matchStats.avgDna ?? '—'}%</div>
              }
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Avg DNA fit</div>
            </div>
            <div style={{ textAlign: 'center', padding: '14px 20px', borderRadius: 'var(--rl)', border: '1px solid rgba(34,197,94,.25)', background: 'rgba(34,197,94,.08)', minWidth: 130 }}>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--green)', lineHeight: 1.4 }}>
                {currency}{salMin || '—'}–{salMax || '—'}k
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Posted salary range</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-violet" onClick={() => navigate('emp-candidates')}>View candidates →</button>
            <button className="btn btn-ghost" onClick={resetForm}>Post another role</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="view" style={{ overflow: 'hidden' }}>
      <div className="role-form-wrap">
        {/* LEFT: form steps */}
        <div className="role-form-main">
          <div className="page-hdr" style={{ marginBottom: 16 }}>
            <div>
              <div className="eyebrow">Outcome-first · Salary-transparent · DNA built in</div>
              <div className="page-title">Post a role</div>
            </div>
            <button className="btn btn-violet btn-sm" onClick={publishRole} disabled={loading}>
              {loading ? 'Publishing...' : 'Publish'}
            </button>
          </div>

          {/* Step bar */}
          <div className="step-bar" style={{ marginBottom: 20 }}>
            {PIP_LABELS.map((label, i) => (
              <div key={i} className={`step-pip${step === i+1 ? ' active' : step > i+1 ? ' done' : ''}`} onClick={() => setStep(i+1)}>{label}</div>
            ))}
          </div>

          {/* Step 1: Basics */}
          {step === 1 && (
            <div>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">1 · Basics</div>
                <div className="g2f">
                  <div className="field"><label>Job title</label><input className="inp" value={title} onChange={e => setTitle(e.target.value)} placeholder="Senior Product Manager" /></div>
                  <div className="field"><label>Department</label><select className="sel" value={dept} onChange={e => setDept(e.target.value)}><option>Product</option><option>Engineering</option><option>Design</option><option>Data</option><option>Operations</option></select></div>
                  <div className="field"><label>Location</label><input className="inp" value={location} onChange={e => setLocation(e.target.value)} placeholder="London, UK" /></div>
                  <div className="field"><label>Work style</label><select className="sel" value={remote} onChange={e => setRemote(e.target.value)}><option>Hybrid · 2 days</option><option>Hybrid · 3 days</option><option>Fully remote</option><option>On-site</option></select></div>
                  <div className="field"><label>Seniority</label><select className="sel" value={seniority} onChange={e => setSeniority(e.target.value)}><option>Mid-level</option><option>Senior</option><option>Lead</option><option>Principal</option><option>Director</option></select></div>
                  <div className="field"><label>Relocation support</label><select className="sel" value={reloc} onChange={e => setReloc(e.target.value)}><option>None</option><option>Package offered</option><option>Visa sponsorship</option><option>Both</option></select></div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-violet btn-sm" onClick={() => setStep(2)}>Next: Compensation →</button>
              </div>
            </div>
          )}

          {/* Step 2: Comp */}
          {step === 2 && (
            <div>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">2 · Compensation</div>
                <div className="field">
                  <label>Currency</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['£', '$', '€', 'CHF'].map(c => (
                      <button
                        key={c}
                        onClick={() => setCurrency(c)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: 'var(--r)',
                          border: `1px solid ${currency === c ? 'var(--violet)' : 'var(--border2)'}`,
                          background: currency === c ? 'rgba(108,71,255,.1)' : 'rgba(255,255,255,.03)',
                          color: currency === c ? '#a78bfa' : 'var(--text2)',
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="g2f">
                  <div className="field"><label>Salary min</label><div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }}>{currency}</span><input className="inp" style={{ paddingLeft: 28 }} value={salMin} onChange={e => setSalMin(e.target.value)} placeholder="90,000" /></div></div>
                  <div className="field"><label>Salary max</label><div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }}>{currency}</span><input className="inp" style={{ paddingLeft: 28 }} value={salMax} onChange={e => setSalMax(e.target.value)} placeholder="120,000" /></div></div>
                </div>
                <div className="sal-benchmark">
                  <div>
                    <div style={{ fontWeight: 700, color: '#a78bfa', marginBottom: 2 }}>Market benchmark · Sr PM · London</div>
                    <div>P25 <strong style={{ color: 'var(--text)' }}>{currency}88k</strong> · P50 <strong style={{ color: 'var(--text)' }}>{currency}108k</strong> · P75 <strong style={{ color: 'var(--text)' }}>{currency}128k</strong> · from 312 verified Hiro hires</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)' }}>
                  Visible salary bands get <strong style={{ color: 'var(--text)' }}>62% more</strong> high-intent expressions of interest.
                </div>
                  <div className="field">
                  <label>Bonus / variable</label>
                  <input className="inp" placeholder="e.g. 10–15% annual bonus" value={bonus} onChange={e => setBonus(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>← Back</button>
                <button className="btn btn-violet btn-sm" onClick={() => setStep(3)}>Next: Outcome →</button>
              </div>
            </div>
          )}

          {/* Step 3: Outcome */}
          {step === 3 && (
            <div>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">3 · Outcome</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>Outcome-first job descriptions attract stronger candidates and reduce interview mismatch.</div>
                <div className="field"><label>In 6 months, this person will have…</label><textarea className="inp textarea" rows={3} placeholder="Owned the full payments product roadmap and shipped at least 2 major features to 9M+ customers…" value={outcome6m} onChange={e => setOutcome6m(e.target.value)} /></div>
                <div className="field"><label>In 12 months, this person will have…</label><textarea className="inp textarea" rows={3} placeholder="Built and led a team of 3 PMs, and driven a measurable improvement in activation and retention…" value={outcome12m} onChange={e => setOutcome12m(e.target.value)} /></div>
                <div className="field"><label>Biggest challenge in the role</label><textarea className="inp textarea" rows={2} placeholder="Navigating complexity across regulatory, engineering, and commercial stakeholders simultaneously…" value={challenge} onChange={e => setChallenge(e.target.value)} /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setStep(2)}>← Back</button>
                <button className="btn btn-violet btn-sm" onClick={() => setStep(4)}>Next: Skills →</button>
              </div>
            </div>
          )}

          {/* Step 4: Skills */}
          {step === 4 && (
            <div>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">4 · Skills &amp; experience</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14 }}>Add the skills Hiro uses to match candidates. Keep it to genuine must-haves.</div>
                <div className="field">
                  <label>Must-have skills</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', borderRadius: 'var(--r)', border: '1px solid var(--border2)', background: 'rgba(255,255,255,.04)', cursor: 'text' }}>
                    {mustSkills.map(s => (
                      <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: 'rgba(108,71,255,.15)', border: '1px solid rgba(108,71,255,.3)', fontSize: 12, color: '#a78bfa' }}>
                        {s} <span style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => setMustSkills(mustSkills.filter(x => x !== s))}>✕</span>
                      </span>
                    ))}
                    <input style={{ border: 'none', background: 'none', outline: 'none', fontSize: 12, color: 'var(--text)', flex: 1, minWidth: 80 }} placeholder="Add skill…" value={skillInput}
                      onChange={e => setSkillInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && skillInput.trim()) { setMustSkills([...mustSkills, skillInput.trim()]); setSkillInput(''); }}} />
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>Suggestions:</span>
                      <button
                        onClick={generateSkills}
                        disabled={isGeneratingSkills}
                        style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        {isGeneratingSkills ? 'Generating...' : '✨ Suggest with AI'}
                      </button>
                    </div>
                    {(suggestedSkills.length > 0 ? suggestedSkills : ['SQL', 'OKRs', 'PSD2 / Open Banking', 'Stakeholder management']).map(s => (
                      <button key={s} style={{ padding: '3px 9px', borderRadius: 999, background: 'rgba(255,255,255,.05)', border: '1px solid var(--border2)', color: 'var(--text2)', fontSize: 11, cursor: 'pointer' }} onClick={() => { if (!mustSkills.includes(s)) setMustSkills([...mustSkills, s]); }}>{s}</button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label>Years of experience</label>
                  <select className="sel" value={expYears} onChange={e => setExpYears(e.target.value)}><option>3+ years</option><option>5+ years</option><option>7+ years</option><option>10+ years</option></select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setStep(3)}>← Back</button>
                <button className="btn btn-violet btn-sm" onClick={() => setStep(5)}>Next: Culture DNA →</button>
              </div>
            </div>
          )}

          {/* Step 5: DNA */}
          {step === 5 && (
            <div>
              <div className="card" style={{ borderColor: 'rgba(236,72,153,.2)', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>🧬</span>
                  <div className="card-title" style={{ marginBottom: 0 }}>5 · Work DNA &amp; culture fit</div>
                  <span className="chip chip-p" style={{ fontSize: 10, marginLeft: 'auto' }}>Auto-pulled from Team DNA</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>Candidates see a personalised DNA compatibility score for this role.</div>
                {[['⚡ Energy style', 'Async-first · deep focus', 'Team avg 78% async. Needs someone comfortable with low meeting density and written-first comms.', 'High'],
                  ['📊 Decision style', 'Data-driven · metrics-first', 'Team avg 80% data-led. Needs comfort making decisions with quantitative evidence.', 'High'],
                  ['🚀 Growth driver', 'Ownership & autonomy', 'Needs high-ownership mentality.', 'Medium']].map(([dim, val, desc, weight]) => (
                  <div key={dim} style={{ padding: '12px 14px', borderRadius: 'var(--r)', border: '1px solid rgba(236,72,153,.2)', background: 'rgba(236,72,153,.05)', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#f9a8d4' }}>{dim}</div>
                      <span className={`chip chip-${weight === 'High' ? 'p' : 'x'}`} style={{ fontSize: 10 }}>Weight: {weight}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{val}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>{desc}</div>
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 4 }} onClick={() => navigate('emp-team-dna')}>Edit full Team DNA →</button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setStep(4)}>← Back</button>
                <button className="btn btn-violet btn-sm" onClick={() => setStep(6)}>Next: Equity →</button>
              </div>
            </div>
          )}

          {/* Step 6: Equity */}
          {step === 6 && (
            <div>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">6 · Equity &amp; benefits</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14 }}>Optional but transparency increases qualified candidates by 34%.</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div className="offer-field"><label>Options (%)</label><input className="inp" placeholder="0.05–0.15%" value={equityMin} onChange={e => setEquityMin(e.target.value)} /></div>
                  <div className="offer-field"><label>Cliff / vest</label><select className="sel" value={cliffVest} onChange={e => setCliffVest(e.target.value)}><option>1yr cliff / 4yr vest</option><option>No cliff / 4yr vest</option></select></div>
                </div>
                <div className="field">
                  <label>Standard Benefits</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4, marginBottom: 16 }}>
                    {[
                      { k: 'health', label: 'Private health', icon: '🏥' },
                      { k: 'ld', label: '£2k L&D budget', icon: '📚' },
                      { k: 'parental', label: 'Enhanced parental', icon: '👶' },
                      { k: 'pto', label: 'Unlimited PTO', icon: '🌴' },
                      { k: 'homeoffice', label: 'Home office budget', icon: '🏠' },
                      { k: 'gym', label: 'Gym / wellness', icon: '💪' }
                    ].map(({ k, label, icon }) => (
                      <label key={k} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 12px',
                        borderRadius: 'var(--r)',
                        border: `1px solid ${perks[k] ? 'rgba(108,71,255,.3)' : 'var(--border2)'}`,
                        background: perks[k] ? 'rgba(108,71,255,.08)' : 'rgba(255,255,255,.03)',
                        cursor: 'pointer',
                        fontSize: 12,
                        transition: 'all 0.2s'
                      }}>
                        <input type="checkbox" checked={perks[k]} onChange={e => setPerks({ ...perks, [k]: e.target.checked })} style={{ accentColor: 'var(--violet)' }} />
                        <span style={{ fontSize: 14 }}>{icon}</span>
                        <span style={{ color: perks[k] ? '#fff' : 'var(--text2)' }}>{label}</span>
                      </label>
                    ))}
                  </div>

                  <label>Custom Perks</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {customPerks.map((p, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 999, background: 'rgba(255,255,255,.05)', border: '1px solid var(--border2)', fontSize: 12, color: 'var(--text2)' }}>
                        {p} <span style={{ cursor: 'pointer', opacity: 0.5 }} onClick={() => setCustomPerks(customPerks.filter((_, idx) => idx !== i))}>✕</span>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="inp"
                      placeholder="Add custom perk (e.g. Free lunch Fridays)"
                      value={perkInput}
                      onChange={e => setPerkInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && perkInput.trim()) {
                          setCustomPerks([...customPerks, perkInput.trim()]);
                          setPerkInput('');
                        }
                      }}
                    />
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '0 16px' }}
                      onClick={() => {
                        if (perkInput.trim()) {
                          setCustomPerks([...customPerks, perkInput.trim()]);
                          setPerkInput('');
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setStep(5)}>← Back</button>
                <button className="btn btn-violet" onClick={publishRole} style={{ padding: '10px 24px' }} disabled={loading}>
                  {loading ? 'Publishing...' : 'Publish role'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: live preview sidebar */}
        <div className="role-form-sidebar">
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', color: 'var(--text3)', marginBottom: 10 }}>Live candidate preview</div>

          <div style={{ borderRadius: 'var(--rl)', border: '1px solid rgba(108,71,255,.25)', background: 'rgba(108,71,255,.08)', padding: '14px 16px', marginBottom: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>Estimated pool</div>
            <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 32, fontWeight: 800, color: '#a78bfa' }}>312</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>candidates would match</div>
            <div style={{ marginTop: 8, padding: '5px 10px', borderRadius: 999, background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.2)', fontSize: 10, color: 'var(--green)', display: 'inline-block' }}>+62% when salary visible</div>
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 7 }}>How candidates see it</div>
          <div className="card2" style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{title || 'Senior Product Manager'}</div>
            <div style={{ fontSize: 12, color: '#a78bfa', marginBottom: 7 }}>{profile?.company_name || 'Monzo'} · Hiro Score 8.6</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 9 }}>
              <span className="chip chip-x" style={{ fontSize: 10 }}>📍 {location || 'London'}</span>
              <span className="chip chip-x" style={{ fontSize: 10 }}>{remote}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 16, fontWeight: 800 }}>{salMin && salMax ? `${currency}${salMin} – ${currency}${salMax}` : `${currency}90k – ${currency}120k`}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <span className="chip chip-g" style={{ fontSize: 10 }}>94% match</span>
                <span className="chip chip-p" style={{ fontSize: 10 }}>🧬 91%</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: 9 }}>Own the payments product end-to-end, shipping to 9M+ {profile?.company_name || 'Monzo'} customers.</div>
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 7 }}>🧬 DNA profile shown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
            {[['⚡ Async-first', '78%'], ['📊 Data-driven', '80%'], ['🚀 High ownership', '82%']].map(([d, v]) => (
              <div key={d} style={{ padding: '8px 10px', borderRadius: 'var(--r)', background: 'rgba(236,72,153,.06)', border: '1px solid rgba(236,72,153,.15)', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#f9a8d4' }}>{d}</span><span className="chip chip-p" style={{ fontSize: 10 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 7 }}>Role completeness</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ fontSize: 12, color: 'var(--green)' }}>✓ Job title</div>
            <div style={{ fontSize: 12, color: 'var(--green)' }}>✓ Location &amp; work style</div>
            <div style={{ fontSize: 12, color: salMin ? 'var(--green)' : 'var(--text3)' }}>{salMin ? '✓' : '○'} Salary band</div>
            <div style={{ fontSize: 12, color: step > 2 ? 'var(--green)' : 'var(--text3)' }}>{step > 2 ? '✓' : '○'} 6-month outcome</div>
            <div style={{ fontSize: 12, color: mustSkills.length > 0 ? 'var(--green)' : 'var(--text3)' }}>{mustSkills.length > 0 ? '✓' : '○'} Must-have skills</div>
            <div style={{ fontSize: 12, color: 'var(--green)' }}>✓ 🧬 Team DNA</div>
          </div>
        </div>
      </div>
    </div>
  );
}
