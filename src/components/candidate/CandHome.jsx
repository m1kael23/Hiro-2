import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { scoreJobForCandidate, DEFAULT_CANDIDATE } from '../../lib/matchStore';

export default function CandHome() {
  const { navigate, setSelectedEmployerId } = useApp();
  const { profile } = useAuth();
  const [dbJobs, setDbJobs] = useState([]);
  const [mutualMatch, setMutualMatch] = useState(null);
  const [mutualCount, setMutualCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recentApps, setRecentApps] = useState([]);

  const candidate = profile || DEFAULT_CANDIDATE;

  // Fetch recent applications for activity feed
  useEffect(() => {
    if (!profile?.id) return;
    const q = query(
      collection(db, 'applications'),
      where('candidateId', '==', profile.id)
    );
    const unsub = onSnapshot(q, snap => {
      const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRecentApps(apps.sort((a, b) => {
        const ta = a.updatedAt?.toMillis?.() || 0;
        const tb = b.updatedAt?.toMillis?.() || 0;
        return tb - ta;
      }).slice(0, 5));
    }, err => console.error('activity feed error', err));
    return () => unsub();
  }, [profile?.id]);

  useEffect(() => {
    const q = query(collection(db, 'jobs'), where('status', '==', 'live'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobs = snapshot.docs.map(doc => {
        const data = doc.data() || {};
        return {
          id: doc.id,
          ...data,
          dnaPrefs: data.dnaPrefs || [50, 50, 50, 50, 50, 50, 50],
          skillsRequired: data.skillsRequired || [],
          salaryMin: data.salMin || 0,
          salaryMax: data.salMax || 0,
          co: data.companyName || 'Unknown',
          emoji: data.emoji || '💼'
        };
      });
      setDbJobs(jobs);
      setLoading(false);
    }, (error) => {
      console.error('CandHome: jobs snapshot error', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch most recent mutual match
  useEffect(() => {
    if (!profile?.id) return;
    const q = query(
      collection(db, 'applications'),
      where('candidateId', '==', profile.id),
      where('candidateExpressedInterest', '==', true),
      where('employerExpressedInterest', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMutualCount(apps.length);
      
      if (apps.length > 0) {
        // Sort by updatedAt descending
        const sorted = apps.sort((a, b) => {
          const tA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
          const tB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
          return tB - tA;
        });
        setMutualMatch(sorted[0]);
      } else {
        setMutualMatch(null);
      }
    }, err => console.error('CandHome: mutual apps error', err));
    return () => unsubscribe();
  }, [profile?.id]);

  const scoredJobs = useMemo(() => {
    return dbJobs.map(job => {
      const scores = scoreJobForCandidate(candidate, job);
      return {
        ...job,
        scores,
        pct: `${scores.overall}%`,
        pctColor: scores.overall >= 88 ? '#22c55e' : '#a78bfa',
        tag: `${job.remote === 'Remote' ? '🏠 Remote' : '📍 ' + (job.location || 'London')} · £${job.salMin}k–${job.salMax}k`
      };
    }).sort((a, b) => b.scores.overall - a.scores.overall);
  }, [dbJobs, candidate]);

  const topMatches = scoredJobs.slice(0, 3);

  const heroMatch = useMemo(() => {
    if (!mutualMatch) return null;
    const job = dbJobs.find(j => j.id === mutualMatch.jobId);
    if (!job) return null;
    const scores = scoreJobForCandidate(candidate, job);
    return {
      ...job,
      scores,
      fit: `${scores.overall}%`,
      location: job.location || 'London',
      salary: `£${job.salMin}k–${job.salMax}k`
    };
  }, [mutualMatch, dbJobs, candidate]);

  return (
    <div className="view">
      <div className="scroll">
        <div style={{ maxWidth: 980 }}>

          {/* Hero action */}
          <div
            style={{
              background: 'linear-gradient(135deg,rgba(13,148,136,.2) 0%,rgba(108,71,255,.12) 55%,rgba(0,21,32,.6) 100%)',
              border: '1px solid rgba(13,148,136,.4)',
              borderRadius: 'var(--rl)',
              padding: '20px 22px',
              marginBottom: 16,
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
            onClick={() => navigate('cand-matches')}
          >
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(13,148,136,.2),transparent 70%)' }} />
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 6 }}>
              {heroMatch ? 'New mutual match' : 'Discover matches'}
            </div>
            <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
              {heroMatch 
                ? <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (heroMatch.employerId) {
                        setSelectedEmployerId(heroMatch.employerId);
                        navigate('cand-company');
                      }
                    }}
                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {heroMatch.co} expressed interest in you
                  </span>
                : 'Find your next career move'}
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', marginBottom: 14 }}>
              {heroMatch 
                ? `${heroMatch.title} · ${heroMatch.remote} · ${heroMatch.salary} · ${heroMatch.fit} Hiro Fit`
                : 'Complete your DNA profile to unlock high-signal matches.'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-sm" style={{ background: 'var(--teal)', border: 'none', color: '#fff', fontWeight: 700 }}
                onClick={e => { e.stopPropagation(); navigate(heroMatch ? 'cand-messages' : 'cand-matches'); }}>
                {heroMatch ? 'Message them →' : 'Explore matches →'}
              </button>
              {mutualCount > 0 && (
                <button className="btn btn-ghost btn-sm"
                  onClick={e => { e.stopPropagation(); navigate('cand-matches'); }}>
                  See all {mutualCount} mutual matches
                </button>
              )}
            </div>
          </div>

          {/* Scorecard strip */}
          {(() => {
            // Real profile strength calculation
            let pts = 0;
            if (profile?.job_title)               pts += 15;
            if (profile?.location)                pts += 10;
            if ((profile?.skills?.length || 0) >= 3) pts += 20;
            if (profile?.dna)                     pts += 25;
            if ((profile?.work_experience?.length || 0) > 0) pts += 15;
            if (profile?.linkedin)                pts += 10;
            if (profile?.portfolio || profile?.github) pts += 5;
            const profileStrength = Math.min(100, pts);
            return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: 16 }}>
            {[
              { label: 'Profile', val: `${profileStrength}%`, color: '#a78bfa', sub: profileStrength >= 80 ? 'Strong profile' : profileStrength >= 50 ? 'Add more details' : 'Complete your profile', subColor: profileStrength >= 80 ? 'var(--green)' : 'var(--amber)', route: 'cand-profile' },
              { label: 'Matches', val: loading ? '...' : scoredJobs.length.toString(), color: 'var(--green)', sub: '12 new today', subColor: 'var(--green)', route: 'cand-matches' },
              { label: 'Views', val: '18', color: 'var(--cyan)', sub: '↑ +5 this week', subColor: 'var(--green)', route: null },
              { label: 'Work DNA', val: '97%', color: '#f9a8d4', sub: 'Active · Strategist', subColor: '#f9a8d4', route: 'cand-work-dna' },
            ].map(({ label, val, color, sub, subColor, route }) => (
              <div key={label} style={{ background: 'var(--bg2)', padding: '12px 14px', cursor: route ? 'pointer' : 'default' }}
                onClick={() => route && navigate(route)}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 12, color: subColor, marginTop: 3 }}>{label === 'Work DNA' ? (profile?.archetype || sub) : sub}</div>
              </div>
            ))}
          </div>
            );
          })()}

          {/* Two-column body */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, alignItems: 'start' }}>

            {/* Left: activity stream */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text3)', padding: '0 2px', marginBottom: 2 }}>Recent activity</div>

              {recentApps.length > 0 ? recentApps.map(app => {
                const isMutual = app.candidateExpressedInterest && app.employerExpressedInterest;
                const stageChanged = app.stage && app.stage !== 'matched';
                const icon = isMutual ? 'ico-messages' : stageChanged ? 'ico-pipeline' : 'ico-eye';
                const bg   = isMutual ? 'rgba(108,71,255,.15)' : stageChanged ? 'rgba(245,158,11,.1)' : 'rgba(56,189,248,.1)';
                const border = isMutual ? 'rgba(108,71,255,.25)' : stageChanged ? 'rgba(245,158,11,.2)' : 'rgba(56,189,248,.2)';
                const color  = isMutual ? '#a78bfa' : stageChanged ? 'var(--amber)' : 'var(--cyan)';
                const title  = isMutual
                  ? `${app.companyName || 'Employer'} · Mutual match!`
                  : stageChanged
                    ? `${app.companyName || 'Employer'} moved you to ${app.stage}`
                    : `${app.companyName || 'Employer'} viewed your profile`;
                const sub = app.jobTitle ? `${app.jobTitle}` : 'Application update';
                return (
                  <div key={app.id} className="card2" style={{ cursor: 'pointer', borderColor: border }} onClick={() => navigate(isMutual ? 'cand-messages' : 'cand-apps')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className={`ico ${icon}`} style={{ color, width: 15, height: 15 }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)' }}>{sub}</div>
                      </div>
                      {isMutual && <span style={{ fontSize: 12, color, fontWeight: 600, flexShrink: 0 }}>Reply →</span>}
                    </div>
                  </div>
                );
              }) : (
                <>
                  <div className="card2" style={{ cursor: 'pointer', borderColor: 'rgba(108,71,255,.2)' }} onClick={() => navigate('cand-matches')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(108,71,255,.15)', border: '1px solid rgba(108,71,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="ico ico-dna" style={{ color: '#a78bfa', width: 15, height: 15 }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Complete your DNA to unlock matches</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)' }}>Your Work DNA™ drives culture-fit scoring</div>
                      </div>
                      <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600, flexShrink: 0 }}>Start →</span>
                    </div>
                  </div>
                  <div className="card2" style={{ cursor: 'pointer' }} onClick={() => navigate('cand-profile')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(56,189,248,.1)', border: '1px solid rgba(56,189,248,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="ico ico-clip" style={{ color: 'var(--cyan)', width: 15, height: 15 }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Strengthen your profile</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)' }}>Add work history and skills to rank higher</div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text3)', padding: '6px 2px 2px', marginTop: 4 }}>Top matches</div>

              {loading ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>Loading matches...</div>
              ) : topMatches.length > 0 ? (
                topMatches.map((j) => (
                  <div key={j.id} className="card2" style={{ cursor: 'pointer' }} onClick={() => navigate('cand-matches')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(14,17,36,.9)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{j.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>
                            {j.title} · <span 
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
                            </span>
                          </div>
                          {j.scores.overall > 90 && <span className="chip chip-t" style={{ fontSize: 10 }}>🤝 Mutual</span>}
                        </div>
                        <span className="chip chip-x" style={{ fontSize: 10 }}>{j.tag}</span>
                      </div>
                      <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 16, fontWeight: 800, color: j.pctColor, flexShrink: 0 }}>{j.pct}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>No matches found yet</div>
              )}

              <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
                onClick={() => navigate('cand-matches')}>See all {scoredJobs.length} matches →</button>
            </div>

            {/* Right sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 18 }}>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 10 }}>Needs your attention</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { ico: 'ico-vault', bg: 'rgba(56,189,248,.1)', border: 'rgba(56,189,248,.2)', color: 'var(--cyan)', title: 'Submit Monzo Vault report', sub: '+9 reliability pts', route: 'cand-vault' },
                    { ico: 'ico-pulse', bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.2)', color: 'var(--amber)', title: 'Pulse check-in due in 4 days', sub: `How are you doing at ${profile?.company_name || 'Finoa'}?`, route: 'cand-pulse' },
                    { ico: 'ico-clip', bg: 'rgba(255,255,255,.05)', border: 'rgba(255,255,255,.1)', color: 'var(--text3)', title: 'Add portfolio link', sub: 'Profile → 100%', route: 'cand-profile' },
                  ].map(({ ico, bg, border, color, title, sub, route }) => (
                    <div key={title} className="home-nudge" onClick={() => navigate(route)} style={{ cursor: 'pointer' }}>
                      <div className="nudge-ico" style={{ background: bg, border: `1px solid ${border}` }}><span className={`ico ${ico}`} style={{ color }} /></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)' }}>{sub}</div>
                      </div>
                      <span style={{ fontSize: 12, color }}>→</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text3)' }}>Applications</div>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => navigate('cand-apps')}>All →</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12 }}>
                  {recentApps.length > 0 ? recentApps.slice(0, 4).map(app => {
                    const isMutual = app.candidateExpressedInterest && app.employerExpressedInterest;
                    const chip = isMutual ? 'Mutual' : app.stage || 'Applied';
                    const chipClass = isMutual ? 'chip-t' : app.stage === 'Interview' || app.stage?.startsWith('Round') ? 'chip-c' : 'chip-x';
                    return (
                      <div key={app.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('cand-apps')}>
                        <span style={{ fontSize: 14 }}>{app.emoji || '💼'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{app.companyName || 'Company'}</div>
                          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{app.jobTitle || 'Role'}</div>
                        </div>
                        <span className={`chip ${chipClass}`} style={{ fontSize: 10 }}>{chip}</span>
                      </div>
                    );
                  }) : (
                    <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>
                      No applications yet —{' '}
                      <span style={{ color: '#a78bfa', cursor: 'pointer' }} onClick={() => navigate('cand-matches')}>explore matches →</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
