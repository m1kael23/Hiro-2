
import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { DNA_DIMENSIONS, getArchetype, defaultDna } from '../../lib/dnaEngine';
import { getGeminiClient } from "../../services/geminiService";

const STEPS_CONFIG = [
  { name: 'Who are you?',    sub: 'Role & experience',      eta: '~5 minutes remaining',  next: 'Next · Skills →' },
  { name: 'Skills',          sub: 'Your skill graph',       eta: '~4 minutes remaining',  next: 'Next · Work DNA™ →' },
  { name: 'Work DNA™',       sub: 'How you actually work',  eta: '~3 minutes remaining',  next: 'Next · What you want →' },
  { name: 'What you want',   sub: 'Salary, style & stage',  eta: '~2 minutes remaining',  next: 'Next · Your fingerprint →' },
  { name: 'Your fingerprint',sub: 'Review & go live',       eta: '~1 minute remaining',   next: '' },
];

// Mock database of skills by role for "Other candidates" recommendations
const ROLE_SKILLS_DB = {
  'Product Manager': ['Roadmapping', 'User Research', 'A/B Testing', 'Stakeholder Management', 'SQL', 'Agile'],
  'Software Engineer': ['System Design', 'Unit Testing', 'CI/CD', 'Code Review', 'TypeScript', 'Node.js'],
  'Designer': ['Figma', 'Prototyping', 'User Flows', 'Design Systems', 'UX Research', 'Visual Design'],
  'Sales': ['CRM', 'Negotiation', 'Lead Generation', 'Pipeline Management', 'Cold Calling'],
  'Marketing': ['SEO', 'Content Strategy', 'Google Analytics', 'Social Media', 'Copywriting'],
  'Data Scientist': ['Python', 'R', 'Machine Learning', 'Statistics', 'Data Visualization', 'Pandas'],
};

const ALL_SKILLS = [
  'Product Management','Fintech','B2B SaaS','AI / ML','Payments',
  'Growth','Data Analysis','SQL','Stakeholder management','Agile',
  'React','Python','Go-to-market','UX Design','Marketing','Sales',
  'Engineering','Operations','People & HR','Finance','Fundraising',
  'TypeScript','Node.js','Leadership','Strategy',
];


export default function CandOnboard() {
  const { navigate } = useApp();
  const { profile, updateProfile } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  
  // Form State
  const [firstName, setFirstName] = useState(profile?.full_name?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(profile?.full_name?.split(' ').slice(1).join(' ') || '');
  const [jobTitle, setJobTitle] = useState(profile?.job_title || '');
  const [experience, setExperience] = useState('6–10 years');
  const [location, setLocation] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [cvSummary, setCvSummary] = useState('');
  
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [primaryFunction, setPrimaryFunction] = useState('Product');
  const [domainSector, setDomainSector] = useState('Fintech');
  const [seniorityLevel, setSeniorityLevel] = useState('Senior IC / Lead');
  const [additionalSkills, setAdditionalSkills] = useState('');
  
  const [dnaValues, setDnaValues] = useState(profile?.dna || defaultDna());
  
  // AI Skills State
  const [isGeneratingSkills, setIsGeneratingSkills] = useState(false);
  const [recommendedSkills, setRecommendedSkills] = useState([]);
  
  // Work Experience State
  const [workHistory, setWorkHistory] = useState(profile?.experience_history || []);
  const [newExp, setNewExp] = useState({ company: '', role: '', duration: '' });
  const [showAddExp, setShowAddExp] = useState(false);

  const currentArchetype = getArchetype(dnaValues);

  const generateAiSkills = async () => {
    if (!jobTitle) return;
    setIsGeneratingSkills(true);
    try {
      const ai = getGeminiClient(); if (!ai) { setIsGeneratingSkills(false); return; }
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `List 8 essential professional skills for a ${jobTitle} in ${domainSector}. Return only a comma-separated list of skills.`,
      });
      const skills = response.text.split(',').map(s => s.trim()).filter(s => s);
      setRecommendedSkills(skills);
    } catch (error) {
      console.error("Error generating skills:", error);
    } finally {
      setIsGeneratingSkills(false);
    }
  };

  // Mock "Other candidates" recommendations
  useEffect(() => {
    if (jobTitle) {
      const mocks = {
        'Product Manager': ['Roadmapping', 'User Research', 'A/B Testing', 'Stakeholder Management'],
        'Software Engineer': ['System Design', 'Unit Testing', 'CI/CD', 'Code Review'],
        'Designer': ['Figma', 'Prototyping', 'User Flows', 'Design Systems']
      };
      // Find closest match or default
      const found = Object.keys(mocks).find(k => jobTitle.toLowerCase().includes(k.toLowerCase()));
      if (found) {
        // Just a small delay to feel "real"
        setTimeout(() => {
          // Add some random ones if not found
        }, 500);
      }
    }
  }, [jobTitle]);

  const addExperience = () => {
    if (!newExp.company || !newExp.role) return;
    setWorkHistory([...workHistory, { ...newExp, id: Date.now() }]);
    setNewExp({ company: '', role: '', duration: '' });
    setShowAddExp(false);
  };

  const removeExperience = (id) => {
    setWorkHistory(workHistory.filter(e => e.id !== id));
  };
  const [salary, setSalary] = useState(85);
  const [equityPreference, setEquityPreference] = useState('Nice to have');
  const [noticePeriod, setNoticePeriod] = useState('1 month');
  const [companyStages, setCompanyStages] = useState(['Series A–C', 'Series D+']);
  const [workModes, setWorkModes] = useState(['Remote-first', 'Hybrid']);
  const [roleTypes, setRoleTypes] = useState(['Full-time']);
  const [workStyles, setWorkStyles] = useState({
    balance: true,
    fastPaced: true,
    mission: false,
    learning: false,
    equity: false
  });
  
  const [privacySettings, setPrivacySettings] = useState({
    visibleToMatched: true,
    shareSalary: false
  });
  const [stealthMode, setStealthMode] = useState(false);
  const [isGoingLive, setIsGoingLive] = useState(false);

  // Dynamic Match Count Logic
  const [matchCount, setMatchCount] = useState(42);

  useEffect(() => {
    // Simulate a dynamic match count based on inputs
    let base = 20;
    
    // Title match
    if (jobTitle.length > 3) base += 45;
    
    // Skills match
    if (selectedSkills.length > 0) {
      base += selectedSkills.length * 8;
    }
    
    // DNA match (Step 3+)
    if (currentStep >= 3) {
      // Check if DNA has been moved from default
      const isDnaChanged = dnaValues.some((v, i) => v !== defaultDna()[i]);
      if (isDnaChanged) base += 65;
      else base += 25;
    }
    
    // Preferences match (Step 4+)
    if (currentStep >= 4) {
      base += 40;
      // Salary filter simulation
      if (salary > 150) base -= 15;
      if (salary < 60) base += 10;
    }
    
    // Add some "jitter" to make it feel real
    const jitter = Math.floor(Math.random() * 8) - 4;
    setMatchCount(Math.max(8, base + jitter));
  }, [jobTitle, selectedSkills, dnaValues, salary, currentStep]);

  const nextStep = () => {
    if (currentStep < 5) {
      setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const jumpTo = (n) => {
    if (n <= Math.max(...completedSteps, 0) + 1) {
      setCurrentStep(n);
    }
  };

  const toggleSkill = (s) => {
    setSelectedSkills(prev => 
      prev.includes(s) ? prev.filter(x => x !== s) : (prev.length < 12 ? [...prev, s] : prev)
    );
  };

  const toggleArrayItem = (setter, item) => {
    setter(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
  };

  const handleDnaChange = (idx, pct) => {
    const newValues = [...dnaValues];
    newValues[idx] = pct;
    setDnaValues(newValues);
  };

  const goLive = async () => {
    setIsGoingLive(true);
    const finalData = {
      full_name: `${firstName} ${lastName}`.trim(),
      job_title: jobTitle,
      experience_years: experience,
      location,
      linkedinUrl,
      cvSummary,
      skills: selectedSkills,
      primary_function: primaryFunction,
      domain_sector: domainSector,
      seniority_level: seniorityLevel,
      additional_skills: additionalSkills,
      dna: dnaValues,
      experience_history: workHistory,
      preferences: {
        salary,
        equity: equityPreference,
        notice: noticePeriod,
        stages: companyStages,
        modes: workModes,
        types: roleTypes,
        styles: workStyles
      },
      privacy: privacySettings,
      stealthMode,
      onboarding_completed: true
    };

    try {
      await updateProfile(finalData);
      setTimeout(() => {
        navigate('cand-home');
      }, 1500);
    } catch (err) {
      console.error("Failed to save profile:", err);
      setIsGoingLive(false);
    }
  };

  const initials = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || '?';
  const fullName = `${firstName} ${lastName}`.trim() || 'Your name';
  const roleStr = `${jobTitle || 'Candidate'} · ${location || 'Remote'}`;

  return (
    <div className="onboard-shell">
      {/* Sidebar */}
      <aside className="onboard-sidebar">
        <div className="onboard-logo">
          <div className="onboard-logo-mark">h</div>
          <div className="onboard-logo-text">hiro<span>.</span></div>
        </div>

        <div className="ob-steps-label">Your profile setup</div>
        <div className="ob-step-list">
          {STEPS_CONFIG.map((s, i) => {
            const n = i + 1;
            const isDone = completedSteps.includes(n) || n < currentStep;
            const isActive = n === currentStep;
            return (
              <div key={n}>
                {i > 0 && <div className={`ob-step-connector ${isDone ? 'done' : ''}`} />}
                <div 
                  className={`ob-step-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                  onClick={() => jumpTo(n)}
                >
                  <div className="ob-step-num">{isDone ? '✓' : n}</div>
                  <div className="ob-step-info">
                    <div className="ob-step-name">{s.name}</div>
                    <div className="ob-step-sub">{s.sub}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {currentStep >= 3 && (
          <div className="ob-archetype-card" style={{ marginTop: 24 }}>
            <div className="ob-archetype-top">
              <div className="ob-archetype-emoji">🧬</div>
              <div>
                <div className="ob-archetype-name">{currentArchetype.name}</div>
                <div className="ob-archetype-sub">DNA archetype active</div>
              </div>
            </div>
            <div className="ob-archetype-desc">Unlocks culture-fit scoring on every role</div>
          </div>
        )}

        <div className="ob-sidebar-quote">
          <strong>&quot;Most job boards ask you to describe yourself.</strong> Hiro learns who you actually are — and matches you to roles where you&apos;ll genuinely thrive.&quot;
        </div>
      </aside>

      {/* Main */}
      <main className="onboard-main">
        <div className="onboard-content-area">
          <div className="ob-top-bar">
            <div className="ob-top-bar-fill" style={{ width: `${(currentStep / 5) * 100}%` }} />
          </div>

          <div className="onboard-content-scroll">
            {/* Step 1: Who are you */}
            {currentStep === 1 && (
              <div className="ob-step active fade-in">
                <div className="ob-step-header">
                  <div className="ob-step-eyebrow">Step 1 of 5 · Identity</div>
                  <h1 className="ob-step-title">Who are <span>you?</span></h1>
                  <p className="ob-step-desc">The basics that anchor your profile. Takes 60 seconds — sets the foundation for every match.</p>
                </div>

                <div className="ob-card">
                  <div className="ob-card-title">Personal details</div>
                  <div className="ob-card-sub">Your name and location help employers know who they&apos;re talking to.</div>

                  <div className="ob-upload-row">
                    <div className="ob-upload-logo">
                      <div className="ob-upload-logo-icon">👤</div>
                      <span>Photo</span>
                    </div>
                    <div className="avatar-upload-body">
                      <div className="ob-field-label">Profile photo</div>
                      <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 8 }}>Optional. Adds a human touch to your profile card. Only shown to matched employers.</p>
                      <button className="btn btn-ghost btn-sm">Upload photo</button>
                    </div>
                  </div>

                  <div className="ob-field-row" style={{ marginBottom: 14 }}>
                    <div className="ob-field" style={{ marginBottom: 0 }}>
                      <label className="ob-field-label">First name</label>
                      <input type="text" className="inp" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jordan" />
                    </div>
                    <div className="ob-field" style={{ marginBottom: 0 }}>
                      <label className="ob-field-label">Last name</label>
                      <input type="text" className="inp" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Mitchell" />
                    </div>
                  </div>
                  <div className="ob-field">
                    <label className="ob-field-label">Current title</label>
                    <input type="text" className="inp" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Senior Product Manager" />
                  </div>
                  <div className="ob-field-row" style={{ marginBottom: 14 }}>
                    <div className="ob-field" style={{ marginBottom: 0 }}>
                      <label className="ob-field-label">Years of experience</label>
                      <select className="sel" value={experience} onChange={e => setExperience(e.target.value)}>
                        <option>0–2 years</option>
                        <option>2–4 years</option>
                        <option>4–6 years</option>
                        <option>6–10 years</option>
                        <option>10+ years</option>
                      </select>
                    </div>
                    <div className="ob-field" style={{ marginBottom: 0 }}>
                      <label className="ob-field-label">Location</label>
                      <input type="text" className="inp" value={location} onChange={e => setLocation(e.target.value)} placeholder="London, UK" />
                    </div>
                  </div>
                  <div className="ob-field" style={{ marginBottom: 0 }}>
                    <label className="ob-field-label">LinkedIn URL</label>
                    <input type="url" className="inp" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="linkedin.com/in/yourname" />
                  </div>
                </div>

                <div className="ob-card">
                  <div className="ob-card-title">Work History</div>
                  <div className="ob-card-sub">Adding your past roles helps us match you with teams that value your background.</div>
                  
                  <div className="ob-exp-list" style={{ marginBottom: 16 }}>
                    {workHistory.map(exp => (
                      <div key={exp.id} className="ob-exp-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 8, border: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{exp.role}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{exp.company} • {exp.duration}</div>
                        </div>
                        <button onClick={() => removeExperience(exp.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16 }}>×</button>
                      </div>
                    ))}
                  </div>

                  {showAddExp ? (
                    <div className="ob-add-exp-form" style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed var(--border2)' }}>
                      <div className="ob-field">
                        <label className="ob-field-label">Company</label>
                        <input className="inp" value={newExp.company} onChange={e => setNewExp({...newExp, company: e.target.value})} placeholder="e.g. Revolut" />
                      </div>
                      <div className="ob-field">
                        <label className="ob-field-label">Role</label>
                        <input className="inp" value={newExp.role} onChange={e => setNewExp({...newExp, role: e.target.value})} placeholder="e.g. Senior Product Manager" />
                      </div>
                      <div className="ob-field">
                        <label className="ob-field-label">Duration</label>
                        <input className="inp" value={newExp.duration} onChange={e => setNewExp({...newExp, duration: e.target.value})} placeholder="e.g. 2021 - Present" />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button className="btn btn-sm btn-violet" onClick={addExperience}>Add Role</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => setShowAddExp(false)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowAddExp(true)}>+ Add Work Experience</button>
                  )}
                </div>

                <div className="ob-card">
                  <div className="ob-card-title">CV / Résumé <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400, marginLeft: 6 }}>Optional — we&apos;ll auto-fill fields below</span></div>
                  <div className="ob-card-sub">We parse your CV to pre-populate skills and experience. Nothing is stored beyond your profile.</div>
                  <div className="cv-zone" style={{ border: '1.5px dashed var(--border2)', borderRadius: 12, padding: 32, textAlign: 'center', background: 'rgba(255,255,255,.02)' }}>
                    <div className="cv-zone-icon" style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                    <div className="cv-zone-title" style={{ fontWeight: 700, marginBottom: 4 }}>Drop your CV here</div>
                    <div className="cv-zone-sub" style={{ fontSize: 12, color: 'var(--text3)' }}>PDF, DOCX, or TXT · Max 5MB</div>
                  </div>
                  <div className="cv-or" style={{ textAlign: 'center', margin: '16px 0', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em' }}>— or paste a summary —</div>
                  <textarea className="textarea" value={cvSummary} onChange={e => setCvSummary(e.target.value)} placeholder="Paste a short bio or work summary. Hiro will extract key information automatically..." style={{ height: 80 }}></textarea>
                </div>
              </div>
            )}

            {/* Step 2: Skills */}
            {currentStep === 2 && (
              <div className="ob-step active fade-in">
                <div className="ob-step-header">
                  <div className="ob-step-eyebrow">Step 2 of 5 · Skill graph</div>
                  <h1 className="ob-step-title">What are your <span>top skills?</span></h1>
                  <p className="ob-step-desc">Pick the skills that define your expertise. You can always refine these — quality over quantity.</p>
                </div>

                <div className="ob-card">
                  <div className="ob-card-title">Core skills</div>
                  <div className="ob-card-sub">These power your match score. Pick up to 12 that genuinely represent you.</div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <button 
                      className="btn btn-sm btn-ghost" 
                      style={{ fontSize: 10, padding: '4px 10px', borderColor: 'var(--violet)', color: 'var(--violet)' }}
                      onClick={generateAiSkills}
                      disabled={isGeneratingSkills}
                    >
                      {isGeneratingSkills ? 'Generating...' : '✨ Generate with AI'}
                    </button>
                  </div>

                  <div className="ob-tag-grid">
                    {ALL_SKILLS.map(s => (
                      <div 
                        key={s} 
                        className={`ob-tag ${selectedSkills.includes(s) ? 'selected' : ''}`}
                        onClick={() => toggleSkill(s)}
                      >
                        {s}
                      </div>
                    ))}
                  </div>

                  {recommendedSkills.length > 0 && (
                    <div style={{ marginTop: 24 }}>
                      <label className="ob-field-label">AI Suggestions for {jobTitle}</label>
                      <div className="ob-tag-grid" style={{ marginTop: 8 }}>
                        {recommendedSkills.map(s => (
                          <div key={s} className={`ob-tag ${selectedSkills.includes(s) ? 'selected' : ''}`} style={{ borderColor: 'var(--violet)', borderStyle: 'dashed' }} onClick={() => toggleSkill(s)}>
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Anonymous recommendations based on other candidates */}
                  {jobTitle && Object.keys(ROLE_SKILLS_DB).some(k => jobTitle.toLowerCase().includes(k.toLowerCase())) && (
                    <div className="fade-in" style={{ marginTop: 24, padding: 16, background: 'rgba(108,71,255,0.05)', borderRadius: 12, border: '1px solid rgba(108,71,255,0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 16 }}>👥</span>
                        <label className="ob-field-label" style={{ marginBottom: 0 }}>Anonymised recommendations from other {jobTitle}s</label>
                      </div>
                      <div className="ob-tag-grid">
                        {ROLE_SKILLS_DB[Object.keys(ROLE_SKILLS_DB).find(k => jobTitle.toLowerCase().includes(k.toLowerCase()))].map(s => (
                          <div key={s} className={`ob-tag ${selectedSkills.includes(s) ? 'selected' : ''}`} onClick={() => toggleSkill(s)}>
                            {s}
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text3)', fontStyle: 'italic' }}>
                        * Based on 140+ similar candidate profiles in the Hiro network.
                      </div>
                    </div>
                  )}

                  <div className="tags-hint" style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)' }}>
                    <span style={{ color: 'var(--violet)', fontWeight: 700 }}>{selectedSkills.length}</span> selected · aim for 5–12 for best matches
                  </div>
                </div>

                <div className="ob-card">
                  <div className="ob-card-title">Function & domain</div>
                  <div className="ob-card-sub">Narrows your matches to the right types of roles.</div>
                  <div className="ob-field-row" style={{ marginBottom: 14 }}>
                    <div className="ob-field" style={{ marginBottom: 0 }}>
                      <label className="ob-field-label">Primary function</label>
                      <select className="sel" value={primaryFunction} onChange={e => setPrimaryFunction(e.target.value)}>
                        <option>Product</option>
                        <option>Engineering</option>
                        <option>Design</option>
                        <option>Data & Analytics</option>
                        <option>Marketing</option>
                        <option>Sales</option>
                        <option>Operations</option>
                        <option>Finance</option>
                        <option>People & HR</option>
                      </select>
                    </div>
                    <div className="ob-field" style={{ marginBottom: 0 }}>
                      <label className="ob-field-label">Domain / Sector</label>
                      <select className="sel" value={domainSector} onChange={e => setDomainSector(e.target.value)}>
                        <option>Fintech</option>
                        <option>B2B SaaS</option>
                        <option>AI / ML</option>
                        <option>E-commerce</option>
                        <option>HealthTech</option>
                        <option>CleanTech</option>
                        <option>Marketplace</option>
                        <option>Deep Tech</option>
                        <option>Consumer</option>
                      </select>
                    </div>
                  </div>
                  <div className="ob-field" style={{ marginBottom: 0 }}>
                    <label className="ob-field-label">Seniority level</label>
                    <select className="sel" value={seniorityLevel} onChange={e => setSeniorityLevel(e.target.value)}>
                      <option>Individual Contributor</option>
                      <option>Senior IC / Lead</option>
                      <option>Staff / Principal</option>
                      <option>Manager</option>
                      <option>Director</option>
                      <option>VP / Head of</option>
                      <option>C-Suite</option>
                    </select>
                  </div>
                </div>

                <div className="ob-card">
                  <div className="ob-card-title">Skills not listed above?</div>
                  <div className="ob-card-sub">Type them in — comma separated.</div>
                  <input type="text" className="inp" value={additionalSkills} onChange={e => setAdditionalSkills(e.target.value)} placeholder="e.g. Figma, Kubernetes, RevOps, Fundraising..." />
                </div>
              </div>
            )}

            {/* Step 3: Work DNA */}
            {currentStep === 3 && (
              <div className="ob-step active fade-in">
                <div className="ob-step-header">
                  <div className="ob-step-eyebrow">Step 3 of 5 · Work DNA™</div>
                  <h1 className="ob-step-title">How do you <span>actually work?</span></h1>
                  <p className="ob-step-desc">~2 minutes. Honest answers get you better matches. This unlocks culture-fit scoring on every role — employers see your archetype, not your raw sliders.</p>
                </div>

                <div className="ob-card">
                  <div className="ob-card-title">Work DNA™ — 7 dimensions</div>
                  <div className="ob-card-sub">Drag each slider to reflect how you genuinely operate, not how you&apos;d like to appear.</div>

                  {DNA_DIMENSIONS.map((d, i) => (
                    <div key={i} className="ob-dna-dim">
                      <div className="ob-dna-dim-header">
                        <span className="ob-dna-dim-icon">{d.icon}</span>
                        <span className="ob-dna-dim-label">{d.label}</span>
                      </div>
                      <div className="ob-dna-ends"><span>{d.left}</span><span>{d.right}</span></div>
                      <div className="ob-dna-track" onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
                        handleDnaChange(i, pct);
                      }}>
                        <div className="ob-dna-fill" style={{ width: `${dnaValues[i]}%` }}></div>
                        <div className="ob-dna-thumb" style={{ left: `${dnaValues[i]}%` }}></div>
                      </div>
                      <div className="ob-dna-dim-desc">→ {d.labels[Math.min(4, Math.floor((dnaValues[i] / 100) * 5))]}</div>
                    </div>
                  ))}

                  <div className="ob-callout" style={{ background: currentArchetype.gradient + '15', borderColor: currentArchetype.color + '40' }}>
                    <div className="ob-callout-icon" style={{ fontSize: 24 }}>{currentArchetype.emoji}</div>
                    <div>
                      <div className="ob-field-label" style={{ marginBottom: 2, color: currentArchetype.color }}>Your Work Archetype: {currentArchetype.name}</div>
                      <div className="insight-text" style={{ fontSize: 13, lineHeight: 1.5 }}>
                        {currentArchetype.desc}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        {currentArchetype.traits.map(t => (
                          <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'var(--text2)' }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Preferences */}
            {currentStep === 4 && (
              <div className="ob-step active fade-in">
                <div className="ob-step-header">
                  <div className="ob-step-eyebrow">Step 4 of 5 · What you want</div>
                  <h1 className="ob-step-title">Your ideal <span>next role</span></h1>
                  <p className="ob-step-desc">This sets your matching filters. Employers won&apos;t see your exact targets — only whether you&apos;re in range.</p>
                </div>

                <div className="ob-card">
                  <div className="ob-card-title">Compensation</div>
                  <div className="ob-card-sub">Set your target. You&apos;ll see a salary transparency score on every matched role.</div>

                  <div className="salary-display" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                    <span className="ob-field-label" style={{ marginBottom: 0 }}>Target salary</span>
                    <span className="salary-value" style={{ fontSize: 24, fontWeight: 800, color: 'var(--violet)' }}>£{salary}k</span>
                  </div>
                  <input type="range" min="30" max="400" value={salary} step="5" style={{ width: '100%', accentColor: 'var(--violet)' }} onChange={e => setSalary(e.target.value)} />
                  <div className="range-ends" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginTop: 6 }}><span>£30k</span><span>£400k+</span></div>

                  <div className="ob-field-row" style={{ marginTop: 20 }}>
                    <div className="ob-field" style={{ marginBottom: 0 }}>
                      <label className="ob-field-label">Equity preference</label>
                      <select className="sel" value={equityPreference} onChange={e => setEquityPreference(e.target.value)}>
                        <option>Not important</option>
                        <option>Nice to have</option>
                        <option>Important to me</option>
                        <option>Required</option>
                      </select>
                    </div>
                    <div className="ob-field" style={{ marginBottom: 0 }}>
                      <label className="ob-field-label">Notice period</label>
                      <select className="sel" value={noticePeriod} onChange={e => setNoticePeriod(e.target.value)}>
                        <option>Immediately</option>
                        <option>1 month</option>
                        <option>2 months</option>
                        <option>3 months</option>
                        <option>6 months</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="ob-card">
                  <div className="ob-card-title">Role & company preferences</div>
                  <div className="ob-card-sub">What kind of environment do you want to step into?</div>

                  <div className="ob-field" style={{ marginBottom: 14 }}>
                    <label className="ob-field-label">Company stage</label>
                    <div className="ob-tag-grid">
                      {['Seed', 'Series A–C', 'Series D+', 'Public', 'Any stage'].map(s => (
                        <div key={s} className={`ob-tag ${companyStages.includes(s) ? 'selected' : ''}`} onClick={() => toggleArrayItem(setCompanyStages, s)}>{s}</div>
                      ))}
                    </div>
                  </div>

                  <div className="ob-field" style={{ marginBottom: 14 }}>
                    <label className="ob-field-label">Work mode</label>
                    <div className="ob-tag-grid">
                      {['Remote-first', 'Hybrid', 'On-site'].map(s => (
                        <div key={s} className={`ob-tag ${workModes.includes(s) ? 'selected' : ''}`} onClick={() => toggleArrayItem(setWorkModes, s)}>{s}</div>
                      ))}
                    </div>
                  </div>

                  <div className="ob-field" style={{ marginBottom: 0 }}>
                    <label className="ob-field-label">Role type</label>
                    <div className="ob-tag-grid">
                      {['Full-time', 'Contract', 'Fractional', 'Advisory'].map(s => (
                        <div key={s} className={`ob-tag ${roleTypes.includes(s) ? 'selected' : ''}`} onClick={() => toggleArrayItem(setRoleTypes, s)}>{s}</div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="ob-card">
                  <div className="ob-card-title">Work style — what matters to you?</div>
                  <div className="ob-card-sub">Toggle everything that genuinely matters for your next role.</div>

                  {[
                    { id: 'balance', icon: '🧘', name: 'Work-life balance is a priority', desc: 'I want a role that respects personal boundaries and sustainable pace.' },
                    { id: 'fastPaced', icon: '🚀', name: 'High-impact, fast-paced environment', desc: 'I want to move fast and see the results of my work quickly.' },
                    { id: 'mission', icon: '🌍', name: 'Mission-driven company', desc: 'Purpose and social/environmental impact matter to me deeply.' },
                    { id: 'learning', icon: '🎓', name: 'Learning & development investment', desc: 'Regular budget, courses, or mentorship is important to me.' },
                    { id: 'equity', icon: '💰', name: 'Equity / ownership upside', desc: 'I want meaningful equity as part of my total compensation.' }
                  ].map(s => (
                    <div key={s.id} className={`ob-toggle-row ${workStyles[s.id] ? 'active' : ''}`} onClick={() => setWorkStyles(prev => ({ ...prev, [s.id]: !prev[s.id] }))}>
                      <div className="ob-toggle-icon">{s.icon}</div>
                      <div className="ob-toggle-body">
                        <div className="ob-toggle-name">{s.name}</div>
                        <div className="ob-toggle-desc">{s.desc}</div>
                      </div>
                      <div className={`ob-toggle-switch ${workStyles[s.id] ? 'on' : ''}`}></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {currentStep === 5 && (
              <div className="ob-step active fade-in">
                <div className="ob-step-header">
                  <div className="ob-step-eyebrow">Step 5 of 5 · Your fingerprint</div>
                  <h1 className="ob-step-title">Your fingerprint is <span>ready 🎉</span></h1>
                  <p className="ob-step-desc">Here&apos;s how matched employers will see you. You can edit any detail from your profile settings at any time.</p>
                </div>

                <div className="profile-preview" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
                  <div className="preview-header" style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
                    <div className="preview-avatar" style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--violet-grad)', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontSize: 24, fontWeight: 800, color: '#fff' }}>{initials}</div>
                    <div>
                      <div className="preview-name" style={{ fontSize: 18, fontWeight: 800 }}>{fullName}</div>
                      <div className="preview-role" style={{ fontSize: 13, color: 'var(--text2)' }}>{roleStr}</div>
                  <div className="preview-pills" style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    {selectedSkills.slice(0, 3).map(s => <div key={s} className="chip chip-x" style={{ fontSize: 10 }}>{s}</div>)}
                    <div className="chip chip-p" style={{ fontSize: 10 }}>🧬 {currentArchetype.name}</div>
                  </div>
                    </div>
                  </div>
                  <div className="preview-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                    <div className="preview-stat">
                      <div className="preview-stat-val" style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>94%</div>
                      <div className="preview-stat-lbl" style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Profile strength</div>
                    </div>
                    <div className="preview-stat">
                      <div className="preview-stat-val" style={{ fontSize: 18, fontWeight: 800, color: 'var(--cyan)' }}>{selectedSkills.length}</div>
                      <div className="preview-stat-lbl" style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Skills</div>
                    </div>
                    <div className="preview-stat">
                      <div className="preview-stat-val" style={{ fontSize: 18, fontWeight: 800, color: '#f9a8d4' }}>🧬</div>
                      <div className="preview-stat-lbl" style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em' }}>DNA active</div>
                    </div>
                    <div className="preview-stat">
                      <div className="preview-stat-val" style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>£{salary}k</div>
                      <div className="preview-stat-lbl" style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Target</div>
                    </div>
                  </div>
                </div>

                <div className="ob-summary-row">
                  <div className="ob-summary-icon">👤</div>
                  <div className="ob-summary-text">
                    <strong>{fullName}</strong> · <span>{jobTitle || 'Candidate'}</span>
                    <span className="chip chip-g" style={{ marginLeft: 8 }}>{experience}</span>
                    <span className="chip chip-v" style={{ marginLeft: 4 }}>{location || 'Remote'}</span>
                  </div>
                </div>
                <div className="ob-summary-row">
                  <div className="ob-summary-icon">⚡</div>
                  <div className="ob-summary-text">
                    <strong>{selectedSkills.length} skills</strong> selected — including
                    <span style={{ color: 'var(--text)', marginLeft: 4 }}>
                      {selectedSkills.length ? selectedSkills.slice(0, 3).join(', ') + (selectedSkills.length > 3 ? ` +${selectedSkills.length - 3} more` : '') : 'none yet'}
                    </span>
                  </div>
                </div>
                <div className="ob-summary-row">
                  <div className="ob-summary-icon">🧬</div>
                  <div className="ob-summary-text">
                    Work DNA™ archetype: <strong>{currentArchetype.name}</strong>
                    <span className="chip chip-p" style={{ marginLeft: 8 }}>DNA active</span>
                    <br /><span style={{ fontSize: 12, color: 'var(--text3)' }}>Unlocks culture-fit scoring on every role.</span>
                  </div>
                </div>
                <div className="ob-summary-row">
                  <div className="ob-summary-icon">💷</div>
                  <div className="ob-summary-text">
                    Target salary: <strong>£{salary}k</strong> · {companyStages.join(', ')} preferred · {workModes.join(' / ')}
                    <span className="chip chip-g" style={{ marginLeft: 8 }}>Private</span>
                  </div>
                </div>

                <div className="ob-card" style={{ marginTop: 20 }}>
                  <div className="ob-card-title">Privacy & visibility settings</div>
                  <div className="ob-card-sub">You control exactly who can see you. All defaults protect your privacy.</div>

                  <div className={`ob-toggle-row ${privacySettings.visibleToMatched ? 'active' : ''}`} onClick={() => setPrivacySettings(p => ({ ...p, visibleToMatched: !p.visibleToMatched }))}>
                    <div className="ob-toggle-icon">🔍</div>
                    <div className="ob-toggle-body">
                      <div className="ob-toggle-name">Visible to matched employers only</div>
                      <div className="ob-toggle-desc">Only companies whose roles match your profile can discover you. No cold outreach without a mutual signal.</div>
                    </div>
                    <div className={`ob-toggle-switch ${privacySettings.visibleToMatched ? 'on' : ''}`}></div>
                  </div>
                  <div className={`ob-toggle-row ${privacySettings.shareSalary ? 'active' : ''}`} onClick={() => setPrivacySettings(p => ({ ...p, shareSalary: !p.shareSalary }))}>
                    <div className="ob-toggle-icon">📊</div>
                    <div className="ob-toggle-body">
                      <div className="ob-toggle-name">Share anonymised salary data</div>
                      <div className="ob-toggle-desc">Help improve salary transparency for other candidates. Your name is never shared.</div>
                    </div>
                    <div className={`ob-toggle-switch ${privacySettings.shareSalary ? 'on' : ''}`}></div>
                  </div>

                  <div className="stealth-bar" style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,.03)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div className="stealth-label" style={{ fontSize: 13, color: 'var(--text2)' }}>
                      <span style={{ marginRight: 8 }}>🥷</span> Stealth mode — hide from current employer&apos;s domain
                    </div>
                    <div className={`ob-toggle-switch ${stealthMode ? 'on' : ''}`} onClick={() => setStealthMode(!stealthMode)}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Nav */}
          <footer className="ob-footer-nav">
            <div className="ob-footer-eta">
              <div className="ob-eta-dot"></div>
              <span>{STEPS_CONFIG[currentStep - 1].eta}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {currentStep > 1 && <button className="btn btn-ghost select-none" onClick={prevStep}>← Back</button>}
              {currentStep < 5 ? (
                <button className="btn btn-violet select-none" onClick={nextStep}>
                  {STEPS_CONFIG[currentStep - 1].next}
                </button>
              ) : (
                <button className="btn btn-violet select-none" onClick={goLive} disabled={isGoingLive}>
                  {isGoingLive ? '✨ Going live...' : '🚀 Go live'}
                </button>
              )}
            </div>
          </footer>
        </div>
      </main>

      {/* Right Panel */}
      <aside className="onboard-right-panel">
        <div className="ob-pool-widget">
          <div className="ob-pool-label">Live Job Match Pool</div>
          <div className="ob-pool-top">
            <div className="ob-pool-ring">
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="6"/>
                <circle cx="32" cy="32" r="26" fill="none" stroke="url(#matchGrad)" strokeWidth="6"
                  strokeDasharray="163.4" strokeDashoffset={163.4 - (matchCount / 247) * 163.4}
                  strokeLinecap="round" />
                <defs>
                  <linearGradient id="matchGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6c47ff"/>
                    <stop offset="100%" stopColor="#f9a8d4"/>
                  </linearGradient>
                </defs>
              </svg>
              <div className="ob-pool-ring-text">
                <div className="ob-pool-ring-num">{matchCount}</div>
                <div className="ob-pool-ring-sub">matched</div>
              </div>
            </div>
            <div>
              <div className="ob-pool-info-title">{matchCount} roles matched</div>
              <div className="ob-pool-info-sub">Active openings that fit your emerging profile.</div>
              <div className="ob-pool-growing">↑ Grows with each step</div>
            </div>
          </div>
          <div className="match-bullets" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="match-bullet" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 11, color: 'var(--text3)' }}>
              <div className="match-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', marginTop: 5, flexShrink: 0 }}></div>
              <span><strong style={{ color: 'var(--text)' }}>4,200+</strong> verified companies hiring on Hiro right now.</span>
            </div>
            <div className="match-bullet" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 11, color: 'var(--text3)' }}>
              <div className="match-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', marginTop: 5, flexShrink: 0 }}></div>
              <span>Candidates get <strong style={{ color: 'var(--text)' }}>3× more</strong> relevant interview invites vs LinkedIn.</span>
            </div>
            <div className="match-bullet" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 11, color: 'var(--text3)' }}>
              <div className="match-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', marginTop: 5, flexShrink: 0 }}></div>
              <span>No recruiters. <strong style={{ color: 'var(--text)' }}>Direct to hiring manager</strong> on every match.</span>
            </div>
          </div>
        </div>

        <div className="ob-preview-widget">
          <div className="ob-preview-label">Your Candidate Card Preview</div>
          <div className="ob-preview-card">
            <div className="ob-preview-banner" style={{ height: 40, background: 'linear-gradient(135deg, var(--violet), var(--pink))' }}></div>
            <div className="ob-preview-body">
              <div className="ob-preview-logo" style={{ marginTop: -20, background: 'var(--violet-grad)', color: '#fff', fontWeight: 800 }}>{initials}</div>
              <div className="ob-preview-co">{fullName || 'Your name'}</div>
              <div className="ob-preview-meta">{roleStr}</div>
              <div className="ob-preview-score">
                <strong style={{ fontSize: 14, fontWeight: 800, color: 'var(--violet)' }}>{currentStep === 5 ? '9.2' : '—'}</strong>
                <span style={{ marginLeft: 4 }}>Match score</span>
              </div>
            </div>
          </div>
        </div>

        <div className="ob-callout" style={{ marginTop: 0 }}>
          <strong>Your data, your control.</strong> Hiro never shares your profile without a mutual match signal. Stealth mode available to hide from your current employer&apos;s domain at any time.
        </div>
      </aside>
    </div>
  );
}
