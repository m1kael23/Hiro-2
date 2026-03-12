
import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getGeminiClient } from '../../services/geminiService';
import { Type } from '@google/genai';
import LocationAutocomplete from '../ui/LocationAutocomplete';

const ALL_SKILLS = [
  { name: 'Payments', cls: 'chip-g' }, { name: 'Fintech', cls: 'chip-g' }, { name: 'SQL', cls: 'chip-g' },
  { name: 'OKRs', cls: 'chip-g' }, { name: 'PSD2', cls: 'chip-g' },
  { name: 'Product strategy', cls: 'chip-v' }, { name: 'Stakeholder management', cls: 'chip-v' },
  { name: 'Data analysis', cls: 'chip-v' }, { name: 'Roadmapping', cls: 'chip-v' },
  { name: 'Figma', cls: 'chip-x' }, { name: 'Python', cls: 'chip-x' },
];

export default function CandProfile() {
  const { showToast, navigate } = useApp();
  const { profile, updateProfile } = useAuth();
  const [avail, setAvail] = useState(profile?.availability || '🟢 Actively looking');
  
  // Local state for profile fields
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    job_title: '',
    experience_years: '',
    location: '',
    relocation: '',
    earliest_start: '',
    notice_period: '',
    looking_for: '',
    linkedin: '',
    portfolio: '',
    github: '',
    notion: '',
  });

  const [workExp, setWorkExp] = useState([]);
  const [editingExp, setEditingExp] = useState(null); // { index, data } or null
  const [showExpModal, setShowExpModal] = useState(false);

  const [userSkills, setUserSkills] = useState([]);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [recommendedSkills, setRecommendedSkills] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [newSkillInput, setNewSkillInput] = useState('');

  useEffect(() => {
    if (profile) {
      let fName = profile.first_name || '';
      let lName = profile.last_name || '';

      // If specific fields are empty but full_name exists, parse it
      if (!fName && !lName && profile.full_name) {
        const parts = profile.full_name.trim().split(/\s+/);
        fName = parts[0] || '';
        lName = parts.slice(1).join(' ') || '';
      }

      setFormData({
        first_name: fName,
        last_name: lName,
        job_title: profile.job_title || '',
        experience_years: profile.experience_years || '',
        location: profile.location || '',
        relocation: profile.relocation || '',
        earliest_start: profile.earliest_start || '',
        notice_period: profile.notice_period || '',
        looking_for: profile.looking_for || '',
        linkedin: profile.linkedin || '',
        portfolio: profile.portfolio || '',
        github: profile.github || '',
        notion: profile.notion || '',
      });
      setWorkExp(profile.work_experience || []);
      setUserSkills(profile.skills || []);
      if (profile.availability) setAvail(profile.availability);
    }
  }, [profile]);

  const fetchRecommendations = async () => {
    if (!formData.job_title) {
      showToast('Add a job title first to get recommendations', 'default');
      return;
    }
    setLoadingRecs(true);
    try {
      const ai = getGeminiClient(); if (!ai) { showToast("Gemini API key not configured", "error"); return; }
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Suggest 10 relevant professional skills for a candidate with the job title: "${formData.job_title}". Return only a JSON array of strings.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      const recs = JSON.parse(response.text);
      setRecommendedSkills(recs.filter(s => !userSkills.includes(s)));
    } catch (err) {
      console.error('AI Error:', err);
      showToast('Could not fetch recommendations', 'error');
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleSave = async () => {
    const { error } = await updateProfile({
      ...formData,
      availability: avail,
      work_experience: workExp,
      skills: userSkills,
      full_name: `${formData.first_name} ${formData.last_name}`.trim()
    });
    if (error) {
      showToast('Error saving changes', 'error');
    } else {
      showToast('Changes saved', 'success');
    }
  };

  const handleAddSkill = (skill) => {
    if (skill && !userSkills.includes(skill)) {
      setUserSkills([...userSkills, skill]);
      setRecommendedSkills(recommendedSkills.filter(s => s !== skill));
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (skill) => {
    setUserSkills(userSkills.filter(s => s !== skill));
  };

  const handleAddExp = () => {
    setEditingExp({ index: -1, data: { title: '', co: '', color: 'var(--violet)', period: '', desc: '' } });
    setShowExpModal(true);
  };

  const handleEditExp = (index) => {
    setEditingExp({ index, data: { ...workExp[index] } });
    setShowExpModal(true);
  };

  const handleSaveExp = () => {
    const newWorkExp = [...workExp];
    if (editingExp.index === -1) {
      newWorkExp.unshift(editingExp.data);
    } else {
      newWorkExp[editingExp.index] = editingExp.data;
    }
    setWorkExp(newWorkExp);
    setShowExpModal(false);
    setEditingExp(null);
  };

  const handleDeleteExp = (index) => {
    const newWorkExp = workExp.filter((_, i) => i !== index);
    setWorkExp(newWorkExp);
    setShowExpModal(false);
    setEditingExp(null);
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const currentFullName = `${formData.first_name} ${formData.last_name}`.trim() || profile?.full_name || 'Candidate';

  const dnaBars = profile?.dna ? [
    { lbl: 'Energy', h: `${Math.round(profile.dna[0] * 100)}%`, bg: 'linear-gradient(180deg,#38bdf8,#6c47ff)' },
    { lbl: 'Decision', h: `${Math.round(profile.dna[1] * 100)}%`, bg: 'linear-gradient(180deg,#a78bfa,#6c47ff)' },
    { lbl: 'Feedback', h: `${Math.round(profile.dna[2] * 100)}%`, bg: 'linear-gradient(180deg,#ec4899,#a78bfa)' },
    { lbl: 'Rhythm', h: `${Math.round(profile.dna[3] * 100)}%`, bg: 'linear-gradient(180deg,#22c55e,#38bdf8)' },
    { lbl: 'Growth', h: `${Math.round(profile.dna[4] * 100)}%`, bg: 'linear-gradient(180deg,#f59e0b,#ec4899)' },
  ] : [];

  const getSkillClass = (skillName) => {
    const found = ALL_SKILLS.find(s => s.name.toLowerCase() === skillName.toLowerCase());
    return found ? found.cls : 'chip-v'; // Default to violet if not in list
  };

  return (
    <div className="view active" style={{ flexDirection: 'column' }}>
      <div className="scroll">
        {/* Header */}
        <div className="page-hdr" style={{ maxWidth: 980 }}>
          <div>
            <div className="eyebrow">{currentFullName} · {formData.job_title || 'Senior PM'}</div>
            <div className="page-title">Your profile</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => showToast('Profile preview — employer view loaded', 'default')}>
              👁 Preview
            </button>
            <button className="btn btn-violet btn-sm" onClick={handleSave}>Save changes</button>
          </div>
        </div>

        <div className="profile-shell">
          {/* LEFT col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Identity */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <div
                  style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--violet-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Manrope',sans-serif", fontSize: 20, fontWeight: 800, color: '#fff', flexShrink: 0, cursor: 'pointer' }}
                  onClick={() => showToast('Photo upload — connect your storage in Settings to enable', 'default')}
                >{getInitials(currentFullName)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{currentFullName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{formData.job_title || 'Candidate'} · Open to roles</div>
                  <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 2 }}>● Active · last seen 2h ago</div>
                </div>
                <span className="chip chip-g" style={{ fontSize: 12 }}>Profile 94%</span>
              </div>
              <div className="g2f">
                <div className="field"><label>First name</label><input className="inp" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} /></div>
                <div className="field"><label>Last name</label><input className="inp" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} /></div>
                <div className="field"><label>Current title</label><input className="inp" value={formData.job_title} onChange={e => setFormData({...formData, job_title: e.target.value})} /></div>
                <div className="field"><label>Years experience</label>
                  <select className="sel" value={formData.experience_years} onChange={e => setFormData({...formData, experience_years: e.target.value})}>
                    <option value="">Select...</option>
                    <option>0–2 years</option>
                    <option>2–4 years</option>
                    <option>4–6 years</option>
                    <option>6–10 years</option>
                    <option>10+ years</option>
                  </select>
                </div>
                <div className="field">
                  <label>Location</label>
                  <LocationAutocomplete 
                    value={formData.location} 
                    onChange={val => setFormData({...formData, location: val})} 
                    placeholder="e.g. London, UK"
                  />
                </div>
                <div className="field"><label>Relocation</label>
                  <select className="sel" value={formData.relocation} onChange={e => setFormData({...formData, relocation: e.target.value})}>
                    <option value="">Select...</option>
                    <option>Not open</option>
                    <option>Open to EU cities</option>
                    <option>Open globally</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Availability */}
            <div className="card">
              <div className="card-title">Availability</div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
                {['🟢 Actively looking', '🟡 Open to conversations', '🔴 Not looking'].map(a => (
                  <div key={a} className={`availability-pill${avail === a ? ' active' : ''}`} onClick={() => setAvail(a)}>{a}</div>
                ))}
              </div>
              <div className="g2f">
                <div className="field"><label>Earliest start</label><input className="inp" type="date" value={formData.earliest_start} onChange={e => setFormData({...formData, earliest_start: e.target.value})} /></div>
                <div className="field"><label>Notice period</label>
                  <select className="sel" value={formData.notice_period} onChange={e => setFormData({...formData, notice_period: e.target.value})}>
                    <option value="">Select...</option>
                    <option>Immediate</option>
                    <option>1 month</option>
                    <option>2 months</option>
                    <option>3 months</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>What I&apos;m looking for</label>
                <textarea className="inp textarea" rows="3" value={formData.looking_for} onChange={e => setFormData({...formData, looking_for: e.target.value})} placeholder="Describe your ideal next role..." />
              </div>
            </div>

            {/* Work experience */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div className="card-title" style={{ marginBottom: 0 }}>Work experience</div>
                <button className="btn btn-ghost btn-sm" onClick={handleAddExp}>+ Add</button>
              </div>
              <div>
                {workExp.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>No work experience added yet.</div>
                ) : (
                  workExp.map((e, i) => (
                    <div key={i} className="exp-entry" style={{ cursor: 'pointer' }} onClick={() => handleEditExp(i)}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, flexShrink: 0 }}>
                        <div className="exp-dot" style={{ background: e.color || 'var(--violet)' }} />
                        {i < workExp.length - 1 && <div className="exp-line" style={{ flex: 1, minHeight: 40 }} />}
                      </div>
                      <div style={{ flex: 1, paddingBottom: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{e.title}</div>
                          <span style={{ fontSize: 10, color: 'var(--violet)' }}>Edit</span>
                        </div>
                        <div style={{ fontSize: 12, color: e.color || 'var(--violet)', fontWeight: 600, marginBottom: 2 }}>{e.co} · {e.period}</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{e.desc}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Skills */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div className="card-title" style={{ marginBottom: 0 }}>Skills</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowSkillsModal(true)}>Manage</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {userSkills.length === 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>No skills added yet.</span>
                ) : (
                  userSkills.map(s => <span key={s} className={`chip ${getSkillClass(s)}`}>{s}</span>)
                )}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)' }}>Green = strong match · Blue = moderate · Grey = light</div>
            </div>

            {/* Links */}
            <div className="card">
              <div className="card-title">Links & portfolio</div>
              <div className="g2f">
                <div className="field"><label>LinkedIn</label><input className="inp" value={formData.linkedin} onChange={e => setFormData({...formData, linkedin: e.target.value})} placeholder="linkedin.com/in/…" /></div>
                <div className="field"><label>Portfolio / website</label><input className="inp" value={formData.portfolio} onChange={e => setFormData({...formData, portfolio: e.target.value})} placeholder="yourwebsite.com" /></div>
                <div className="field"><label>GitHub</label><input className="inp" value={formData.github} onChange={e => setFormData({...formData, github: e.target.value})} placeholder="github.com/…" /></div>
                <div className="field"><label>Case study / Notion</label><input className="inp" value={formData.notion} onChange={e => setFormData({...formData, notion: e.target.value})} placeholder="notion.so/…" /></div>
              </div>
            </div>

            {/* Work DNA mini */}
            <div className="card" style={{ borderColor: 'rgba(236,72,153,.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div className="card-title" style={{ marginBottom: 0 }}>🧬 Work DNA</div>
                <button className="btn btn-dna btn-sm" onClick={() => navigate('cand-work-dna')}>Edit full DNA →</button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, height: 56, alignItems: 'flex-end' }}>
                {dnaBars.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Complete onboarding to see your DNA.</div>
                ) : (
                  dnaBars.map(b => (
                    <div key={b.lbl} className="dna-bar-wrap">
                      <div className="dna-bar-outer">
                        <div className="dna-bar-inner" style={{ height: b.h, background: b.bg }} />
                      </div>
                      <div className="dna-bar-lbl">{b.lbl}</div>
                    </div>
                  ))
                )}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {profile?.archetype ? (
                  <span className="dna-trait">{profile.archetype}</span>
                ) : null}
                {['Async-first','Data-driven','Mastery-motivated'].map(t => (
                  <span key={t} className="dna-trait">{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Profile strength */}
            <div style={{ background: 'var(--violet-grad)', borderRadius: 'var(--rl)', padding: 20, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.07)' }} />
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', opacity: .65, marginBottom: 4, color: '#fff' }}>Profile strength</div>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 44, fontWeight: 800, lineHeight: 1, color: '#fff' }}>94%</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', marginBottom: 14 }}>Near-perfect fingerprint</div>
              <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 'var(--rp)', height: 6, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ width: '94%', height: '100%', background: 'rgba(255,255,255,.85)', borderRadius: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {['Work DNA complete','Work experience added','Skills verified','Availability set'].map(i => (
                  <div key={i} className="strength-item" style={{ color: 'rgba(255,255,255,.9)' }}>✓ {i}</div>
                ))}
                <div className="strength-item" style={{ color: 'rgba(255,255,255,.45)' }}>○ Portfolio link (+3%)</div>
                <div className="strength-item" style={{ color: 'rgba(255,255,255,.45)' }}>○ Case study (+3%)</div>
              </div>
            </div>

            {/* Visibility */}
            <div className="card">
              <div className="card-title">Visibility</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 'var(--r)', background: 'rgba(34,197,94,.07)', border: '1px solid rgba(34,197,94,.25)' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>🟢 Visible to employers</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>Matched employers only</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('cand-stealth')}>Manage →</button>
                </div>
                <div style={{ padding: '9px 12px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border2)', fontSize: 12, color: 'var(--text2)' }}>
                  🛡️ Your current employer <strong>cannot</strong> see your profile.{' '}
                  <button style={{ background: 'none', border: 'none', color: 'var(--violet)', cursor: 'pointer', fontSize: 12, padding: 0 }} onClick={() => navigate('cand-stealth')}>Stealth settings →</button>
                </div>
              </div>
            </div>

            {/* How employers see you */}
            <div className="card">
              <div className="card-title">How employers see you</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>Top 3 attributes employers see first:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {profile?.archetype && (
                  <div style={{ padding: '9px 12px', borderRadius: 'var(--r)', background: 'rgba(236,72,153,.07)', border: '1px solid rgba(236,72,153,.2)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>🧬</span><div><strong style={{ color: '#f9a8d4' }}>{profile.archetype}</strong> — async-first, data-driven</div>
                  </div>
                )}
                {userSkills.length > 0 && (
                  <div style={{ padding: '9px 12px', borderRadius: 'var(--r)', background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.2)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>💼</span><div><strong style={{ color: 'var(--green)' }}>{userSkills.slice(0, 3).join(' · ')}</strong></div>
                  </div>
                )}
                {formData.notice_period && (
                  <div style={{ padding: '9px 12px', borderRadius: 'var(--r)', background: 'rgba(56,189,248,.06)', border: '1px solid rgba(56,189,248,.2)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>🚀</span><div><strong style={{ color: 'var(--cyan)' }}>{formData.relocation || 'Open to relocation'} · {formData.notice_period} notice</strong></div>
                  </div>
                )}
                {!profile?.archetype && userSkills.length === 0 && !formData.notice_period && (
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Complete your profile to see how employers view you.</div>
                )}
              </div>
              <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={() => showToast('Employer preview opened', 'default')}>
                👁 Full employer preview →
              </button>
            </div>

            {/* Stats */}
            <div className="card">
              <div className="card-title">Your stats this month</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[['Profile views','0','#a78bfa'],['Employers shortlisted you','0','var(--cyan)'],['DNA match requests','0','#ec4899'],['Mutual matches','0','var(--green)']].map(([lbl,val,col]) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <span style={{ color: 'var(--text2)' }}>{lbl}</span>
                    <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, color: col }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Experience Modal */}
      {showExpModal && editingExp && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: 500, margin: 20 }}>
            <div className="card-title">{editingExp.index === -1 ? 'Add experience' : 'Edit experience'}</div>
            <div className="g2f">
              <div className="field"><label>Job title</label><input className="inp" value={editingExp.data.title} onChange={e => setEditingExp({...editingExp, data: {...editingExp.data, title: e.target.value}})} placeholder="e.g. Senior Product Manager" /></div>
              <div className="field"><label>Company</label><input className="inp" value={editingExp.data.co} onChange={e => setEditingExp({...editingExp, data: {...editingExp.data, co: e.target.value}})} placeholder="e.g. Revolut" /></div>
              <div className="field"><label>Period</label><input className="inp" value={editingExp.data.period} onChange={e => setEditingExp({...editingExp, data: {...editingExp.data, period: e.target.value}})} placeholder="e.g. Jan 2020 – Mar 2022 · 2yr" /></div>
              <div className="field">
                <label>Color theme</label>
                <select className="sel" value={editingExp.data.color} onChange={e => setEditingExp({...editingExp, data: {...editingExp.data, color: e.target.value}})}>
                  <option value="var(--violet)">Violet</option>
                  <option value="var(--cyan)">Cyan</option>
                  <option value="var(--teal)">Teal</option>
                  <option value="var(--green)">Green</option>
                  <option value="var(--orange)">Orange</option>
                </select>
              </div>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Description</label>
              <textarea className="inp textarea" rows="4" value={editingExp.data.desc} onChange={e => setEditingExp({...editingExp, data: {...editingExp.data, desc: e.target.value}})} placeholder="Key achievements and responsibilities..." />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <div>
                {editingExp.index !== -1 && (
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDeleteExp(editingExp.index)}>Delete</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowExpModal(false)}>Cancel</button>
                <button className="btn btn-violet btn-sm" onClick={handleSaveExp}>Apply</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Skills Modal */}
      {showSkillsModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: 550, margin: 20, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="card-title">Manage Skills</div>
            
            <div className="scroll" style={{ flex: 1, paddingRight: 4 }}>
              {/* Current Skills */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 8 }}>Your Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {userSkills.length === 0 && <div style={{ fontSize: 13, color: 'var(--text3)' }}>No skills added.</div>}
                  {userSkills.map(s => (
                    <span key={s} className={`chip ${getSkillClass(s)}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {s}
                      <button 
                        onClick={() => handleRemoveSkill(s)}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex', opacity: 0.6 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Add Manual */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 8 }}>Add Skill</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input 
                    className="inp" 
                    placeholder="Type a skill..." 
                    value={newSkillInput}
                    onChange={e => setNewSkillInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddSkill(newSkillInput)}
                  />
                  <button className="btn btn-violet btn-sm" onClick={() => handleAddSkill(newSkillInput)}>Add</button>
                </div>
              </div>

              {/* AI Recommendations */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)' }}>AI Recommendations</div>
                  <button 
                    className="btn btn-ghost btn-sm" 
                    onClick={fetchRecommendations}
                    disabled={loadingRecs}
                    style={{ fontSize: 10 }}
                  >
                    {loadingRecs ? 'Generating...' : '✨ Refresh'}
                  </button>
                </div>
                
                {loadingRecs ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                    Analyzing your profile for relevant skills...
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {recommendedSkills.length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>
                        {formData.job_title ? 'Click refresh to get AI-powered skill suggestions.' : 'Add a job title to get AI recommendations.'}
                      </div>
                    )}
                    {recommendedSkills.map(s => (
                      <button 
                        key={s} 
                        className="chip chip-v" 
                        style={{ cursor: 'pointer', border: '1px dashed var(--violet)', background: 'none' }}
                        onClick={() => handleAddSkill(s)}
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-violet btn-sm" onClick={() => setShowSkillsModal(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
