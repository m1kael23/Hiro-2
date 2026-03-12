import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { scoreJobForCandidate, DEFAULT_CANDIDATE } from '../../lib/matchStore';
import CityIntelligence from './CityIntelligence';

export default function CandJobs() {
  const { showToast, navigate, setSelectedEmployerId } = useApp();
  const { profile } = useAuth();
  const [dbJobs, setDbJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [remoteFilter, setRemoteFilter] = useState('All');
  const [salaryFilter, setSalaryFilter] = useState('All');
  const [fitFilter, setFitFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [interested, setInterested] = useState({});
  const [applied, setApplied] = useState({});
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);

  const candidate = profile || DEFAULT_CANDIDATE;

  useEffect(() => {
    const q = query(collection(db, 'jobs'), where('status', '==', 'live'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobs = snapshot.docs.map(doc => {
        const data = doc.data() || {};
        return {
          id: doc.id,
          ...data,
          employerId: data.employerId || '', // Ensure employerId is present
          dnaPrefs: data.dnaPrefs || [50, 50, 50, 50, 50, 50, 50],
          skillsRequired: data.skillsRequired || [],
          skillsNice: data.skillsNice || [],
          salaryMin: data.salMin || 0,
          salaryMax: data.salMax || 0,
          co: data.companyName || 'Unknown',
          emoji: data.emoji || '💼',
          salary: `${data.currency || '£'}${data.salMin || 0}k–${data.salMax || 0}k`,
          location: data.location || 'London',
          remote: data.remote || 'Hybrid',
          stage: data.stage || 'Series C',
          hs: data.hiroScore || '8.5/10',
          outcome: data.outcome || data.outcome6m || 'Job description pending...',
          quick: {
            posted: data.createdAt?.toDate ? `${Math.floor((Date.now() - data.createdAt.toDate()) / (1000 * 60 * 60 * 24))} days ago` : 'Just now',
            applicants: '0 expressed',
            avg: '14 days',
            response: '100%',
            dnaData: '1 member ✓'
          }
        };
      });
      setDbJobs(jobs);
      setLoading(false);
    }, (error) => {
      console.error('CandJobs: jobs snapshot error', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch candidate's applications to show interest status
  useEffect(() => {
    if (!profile?.id) return;
    const q = query(collection(db, 'applications'), where('candidateId', '==', profile.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = {};
      const appliedApps = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        apps[data.jobId] = data.candidateExpressedInterest;
        appliedApps[data.jobId] = data.status === 'applied' || (data.stage && data.stage !== 'matched');
      });
      setInterested(apps);
      setApplied(appliedApps);
    }, (err) => {
      console.error('CandJobs: applications snapshot error', err);
    });
    return () => unsubscribe();
  }, [profile?.id]);

  const filteredJobs = useMemo(() => {
    let list = dbJobs.map(job => {
      const scores = scoreJobForCandidate(candidate, job);
      return {
        ...job,
        scores,
        fit: `${scores.overall}%`,
        dna: `${scores.dna}%`,
        fitColor: scores.overall >= 88 ? '#22c55e' : '#a78bfa',
        pills: [`📍 ${job.location}`, `⚡ ${job.remote}`, job.stage],
        sal: `${job.salary} + equity`
      };
    });

    if (remoteFilter !== 'All') {
      list = list.filter(j => j.remote === remoteFilter);
    }
    if (salaryFilter !== 'All') {
      const min = parseInt(salaryFilter);
      list = list.filter(j => j.salaryMax >= min);
    }
    if (fitFilter !== 'All') {
      const min = parseInt(fitFilter);
      list = list.filter(j => j.scores.overall >= min);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.co.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => b.scores.overall - a.scores.overall);
  }, [dbJobs, candidate, remoteFilter, salaryFilter, fitFilter, searchQuery]);

  const selected = useMemo(() => {
    if (selectedId) return filteredJobs.find(j => j.id === selectedId);
    return filteredJobs[0];
  }, [selectedId, filteredJobs]);

  async function expressInterest(id) {
    if (!profile?.id) {
      showToast('Please sign in to express interest', 'error');
      return;
    }

    if (interested[id]) {
      setConfirmRemoveId(id);
      return;
    }

    const job = filteredJobs.find(j => j.id === id);
    if (!job) return;

    const appId = `${profile.id}_${id}`;
    const appRef = doc(db, 'applications', appId);

    try {
      await setDoc(appRef, {
        id: appId,
        jobId: id,
        candidateId: profile.id,
        employerId: job.employerId,
        candidateExpressedInterest: true,
        status: 'pending',
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp() // setDoc with merge: true or check existence if you want to preserve createdAt
      }, { merge: true });

      // Create notification for employer
      if (job.employerId) {
        await addDoc(collection(db, 'notifications'), {
          userId: job.employerId,
          title: 'New Interest!',
          message: `${profile.full_name || 'A candidate'} is interested in your ${job.title} role.`,
          type: 'interest',
          route: 'emp-candidates',
          read: false,
          createdAt: serverTimestamp()
        });
      }

      showToast('Interest sent to ' + (job?.co || 'Company'), 'success');
    } catch (err) {
      console.error('Error expressing interest:', err);
      showToast('Failed to send interest', 'error');
    }
  }

  async function removeInterest(id) {
    if (!profile?.id) return;
    const appId = `${profile.id}_${id}`;
    const appRef = doc(db, 'applications', appId);
    try {
      await setDoc(appRef, {
        candidateExpressedInterest: false,
        updatedAt: serverTimestamp()
      }, { merge: true });
      showToast('Interest removed', 'success');
      setConfirmRemoveId(null);
    } catch (err) {
      console.error('Error removing interest:', err);
      showToast('Failed to remove interest', 'error');
    }
  }

  async function applyToJob(id) {
    if (!profile?.id) {
      showToast('Please sign in to apply', 'error');
      return;
    }

    if (applied[id]) return;

    const job = filteredJobs.find(j => j.id === id);
    if (!job) return;

    const appId = `${profile.id}_${id}`;
    const appRef = doc(db, 'applications', appId);

    try {
      await setDoc(appRef, {
        id: appId,
        jobId: id,
        candidateId: profile.id,
        employerId: job.employerId,
        candidateExpressedInterest: true,
        status: 'applied',
        stage: 'screen', // Direct application moves them to screening
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true });

      // Create notification for employer
      if (job.employerId) {
        await addDoc(collection(db, 'notifications'), {
          userId: job.employerId,
          title: 'New Application!',
          message: `${profile.full_name || 'A candidate'} applied for your ${job.title} role.`,
          type: 'application',
          route: 'emp-pipeline',
          read: false,
          createdAt: serverTimestamp()
        });
      }

      showToast('Application submitted to ' + (job?.co || 'Company'), 'success');
    } catch (err) {
      console.error('Error applying to job:', err);
      showToast('Failed to submit application', 'error');
    }
  }

  if (loading) {
    return (
      <div className="view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text3)' }}>Loading jobs...</div>
      </div>
    );
  }

  return (
    <div className="view" style={{ flexDirection: 'row' }}>
      <div className="split">
        {/* Left: job list */}
        <div className="split-left">
          <div className="split-left-hdr">
            <div className="split-left-title">Your matches <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)' }}>47 · 12 new</span></div>
            <div className="split-search">
              <span className="ico ico-search" style={{ width: 14, height: 14, background: 'var(--text3)', flexShrink: 0 }} />
              <input
                placeholder="Search roles, companies…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="filter-row" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
              <select className="sel-mini" value={remoteFilter} onChange={e => setRemoteFilter(e.target.value)}>
                <option value="All">Location</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Office">Office</option>
              </select>
              <select className="sel-mini" value={salaryFilter} onChange={e => setSalaryFilter(e.target.value)}>
                <option value="All">Salary</option>
                <option value="80">£80k+</option>
                <option value="100">£100k+</option>
                <option value="120">£120k+</option>
                <option value="150">£150k+</option>
              </select>
              <select className="sel-mini" value={fitFilter} onChange={e => setFitFilter(e.target.value)}>
                <option value="All">Hiro Fit</option>
                <option value="80">80%+</option>
                <option value="90">90%+</option>
                <option value="95">95%+</option>
              </select>
            </div>
          </div>
          <div className="split-scroll">
            {filteredJobs.map(j => (
              <div key={j.id} className={`jcard${selected?.id === j.id ? ' active' : ''}`} onClick={() => setSelectedId(j.id)}>
                <div className="jcard-top">
                  <div className="jcard-logo">{j.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div className="jcard-title">{j.title}</div>
                    <div 
                      className="jcard-co" 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (j.employerId) {
                          setSelectedEmployerId(j.employerId);
                          navigate('cand-company');
                        }
                      }}
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {j.co}
                    </div>
                  </div>
                  <div className="jcard-score">
                    <div className="jcard-fit" style={{ color: j.fitColor }}>{j.fit}</div>
                    <div className="jcard-fit-lbl">Hiro Fit</div>
                    <div className="jcard-dna-sub">🧬 {j.dna}</div>
                  </div>
                </div>
                <div className="jcard-pills">{j.pills.map(p => <span key={p} className="jcard-pill">{p}</span>)}</div>
                <div className="jcard-sal">{j.sal}</div>
              </div>
            ))}
          </div>
          <div className="kbd-legend">
            <span className="kbd-item"><kbd>J</kbd><kbd>K</kbd> navigate</span>
            <span className="kbd-item"><kbd>↵</kbd> open</span>
            <span className="kbd-item"><kbd>Space</kbd> save</span>
            <span className="kbd-item"><kbd>A</kbd> apply</span>
          </div>
        </div>

        {/* Right: detail */}
        <div className="split-right">
          {selected ? (
            <div className="split-right-scroll">
              <div className="split-detail-grid">
                <div>
                  <div className="jhero">
                    <div className="jhero-inner">
                      <div className="jhero-top">
                        <div className="jhero-logo">{selected.emoji}</div>
                        <div>
                          <div className="jhero-title">{selected.title}</div>
                          <div className="jhero-co">
                            <span 
                              onClick={() => {
                                if (selected.employerId) {
                                  setSelectedEmployerId(selected.employerId);
                                  navigate('cand-company');
                                }
                              }}
                              style={{ cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              {selected.co}
                            </span>
                            {' '}
                            <span className="chip chip-g hs-tip-trigger" style={{ fontSize: 10 }}>Hiro Score {selected.hs}</span>
                          </div>
                        </div>
                      </div>
                      <div className="jhero-pills">
                        <span className="jhero-pill">📍 {selected.location}</span>
                        <span className="jhero-pill">🏢 {selected.stage}</span>
                        <span className="jhero-pill sal">{selected.sal}</span>
                      </div>
                      <div className="jhero-ctas">
                        <button className="btn-express" onClick={() => expressInterest(selected.id)}>
                          {interested[selected.id] ? '✓ Interest sent!' : '✨ Express interest'}
                        </button>
                        <button 
                          className="btn-violet" 
                          style={{ 
                            padding: '0 20px', 
                            height: 42, 
                            borderRadius: 'var(--r)', 
                            fontWeight: 700,
                            opacity: applied[selected.id] ? 0.6 : 1,
                            cursor: applied[selected.id] ? 'default' : 'pointer'
                          }} 
                          onClick={() => applyToJob(selected.id)}
                          disabled={applied[selected.id]}
                        >
                          {applied[selected.id] ? '✓ Applied' : 'Apply Now'}
                        </button>
                        <button className="btn-save-hero" onClick={() => showToast('Job saved', 'success')}>🔖 Save</button>
                      </div>
                    </div>
                  </div>
                  <div className="jcontent">
                    <div className="jsec-label">What you&apos;ll own</div>
                    <div className="joutcome">{selected.outcome}</div>
                    <div className="jsec-label">Responsibilities</div>
                    <div className="jbullet"><div className="jbullet-dot" />Define and own product strategy end-to-end</div>
                    <div className="jbullet"><div className="jbullet-dot" />Work with engineering, design and data to ship high-impact features</div>
                    <div className="jbullet"><div className="jbullet-dot" />Drive commercial outcomes — revenue, growth, NPS</div>
                    <div className="jsec-label">Requirements</div>
                    <div className="jreq must"><div className="jreq-lbl">Must-haves</div>
                      {selected.skillsRequired?.map(skill => (
                        <div key={skill} className="jbullet"><div className="jbullet-dot" />{skill}</div>
                      ))}
                      {!selected.skillsRequired?.length && <div className="jbullet"><div className="jbullet-dot" />5+ years PM experience</div>}
                    </div>
                  </div>
                  <div className="jcontent">
                    <div className="jsec-label" style={{ marginTop: 0 }}>Interview process</div>
                    <div className="jtl" style={{ marginBottom: 20 }}>
                      {['Intro call · 30 min · Culture fit', 'Product case study · Take-home · 3 days', 'Panel interview · 60 min · Cross-functional', 'Offer · 2–3 days · Full comp breakdown'].map((step, i) => (
                        <div key={i} className="jtl-item">
                          <div className="jtl-num">{i + 1}</div>
                          <div><div className="jtl-title">{step.split(' · ')[0]}</div><div className="jtl-desc">{step.split(' · ').slice(1).join(' · ')}</div></div>
                        </div>
                      ))}
                    </div>
                    <CityIntelligence toCity={selected.location} />
                  </div>
                </div>

                {/* Sidebar */}
                <div style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="jmatch-card">
                    <div className="ring-wrap" style={{ margin: '0 auto 8px' }}>
                      <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                        <defs><linearGradient id="rg"><stop offset="0%" stopColor="#6c47ff" /><stop offset="100%" stopColor="#a78bfa" /></linearGradient></defs>
                        <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="6" />
                        <circle cx="40" cy="40" r="34" fill="none" stroke="url(#rg)" strokeWidth="6" strokeLinecap="round" strokeDasharray="213.6" strokeDashoffset={213.6 - (213.6 * selected.scores.overall / 100)} />
                      </svg>
                      <div className="ring-label" style={{ color: '#a78bfa' }}>{selected.fit}</div>
                    </div>
                    <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text3)', marginBottom: 2 }}>Hiro Fit</div>
                    <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 14, fontWeight: 800, marginBottom: 2 }}>Excellent match</div>
                    <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, marginBottom: 10 }}>Top 5% of candidates</div>
                    {[['Skills', `${selected.scores.skills}%`, 'var(--cyan)'], ['DNA', selected.dna, '#f9a8d4'], ['Culture', '98%', '#a78bfa'], ['Seniority', '90%', 'var(--cyan)']].map(([label, pct, color]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: 'var(--text3)', width: 50 }}>{label}</span>
                        <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,.07)', borderRadius: 2 }}>
                          <div style={{ height: 3, borderRadius: 2, background: color, width: pct }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color, width: 32, textAlign: 'right' }}>{pct}</span>
                      </div>
                    ))}
                    <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button className="btn-express" style={{ width: '100%', justifyContent: 'center' }} onClick={() => expressInterest(selected.id)}>
                        {interested[selected.id] ? '✓ Interest sent!' : '✨ Express interest'}
                      </button>
                      <button 
                        className="btn-violet" 
                        style={{ 
                          width: '100%', 
                          height: 38, 
                          borderRadius: 'var(--r)', 
                          fontWeight: 700,
                          opacity: applied[selected.id] ? 0.6 : 1,
                          cursor: applied[selected.id] ? 'default' : 'pointer'
                        }} 
                        onClick={() => applyToJob(selected.id)}
                        disabled={applied[selected.id]}
                      >
                        {applied[selected.id] ? '✓ Applied' : 'Apply Now'}
                      </button>
                    </div>
                    <div style={{ marginTop: 7, fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>No CV needed · Uses your Hiro profile</div>
                  </div>

                  {/* DNA compat */}
                  <div className="dna-compat-card">
                    <div className="dna-compat-header">
                      <span style={{ fontSize: 20 }}>🧬</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#f9a8d4', marginBottom: 2 }}>DNA fit</div>
                        <div className="dna-compat-score">{selected.dna}</div>
                      </div>
                      <div style={{ marginLeft: 'auto' }}><span className="chip chip-p" style={{ fontSize: 10 }}>Near-perfect</span></div>
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 10 }}>Your work style complements this team&apos;s gaps.</div>
                    {[['Energy style', '95%'], ['Decision style', '92%'], ['Feedback style', '88%'], ['Work rhythm', '89%']].map(([label, pct]) => (
                      <div key={label} className="dna-compat-bar">
                        <span className="dna-compat-lbl">{label}</span>
                        <div className="dna-compat-track"><div className="dna-compat-fill" style={{ width: pct }} /></div>
                        <span className="dna-compat-pct">{pct}</span>
                      </div>
                    ))}
                  </div>

                  <div className="jquick">
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text3)', marginBottom: 8 }}>Quick facts</div>
                    {Object.entries(selected.quick).map(([k, v]) => (
                      <div key={k} className="jqrow">
                        <span className="jqlbl">{k === 'avg' ? 'Avg to offer' : k === 'response' ? 'Response rate' : k === 'dnaData' ? 'DNA data' : k.charAt(0).toUpperCase() + k.slice(1)}</span>
                        <span className="jqval" style={k === 'response' ? { color: 'var(--green)' } : k === 'dnaData' ? { color: '#f9a8d4' } : {}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
              Select a job to view details
            </div>
          )}
        </div>
      </div>
      {/* Confirmation Modal */}
      {confirmRemoveId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 24, maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>🤔</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Remove interest?</div>
            <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24 }}>
              Are you sure you want to remove your interest in this role? The employer will no longer see you in their interested list and this action may slightly affect your Reliability Score
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmRemoveId(null)}>Cancel</button>
              <button className="btn-violet" style={{ flex: 1, background: 'var(--red)' }} onClick={() => removeInterest(confirmRemoveId)}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
