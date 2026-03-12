import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { scoreJobForCandidate, DEFAULT_CANDIDATE } from '../../lib/matchStore';
import CandOfferNegotiationModal from './CandOfferNegotiationModal';

export default function CandApps() {
  const { navigate, setSelectedEmployerId } = useApp();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [dbApps, setDbApps] = useState([]);
  const [dbJobs, setDbJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [negotiatingJobId, setNegotiatingJobId] = useState(null);

  const candidate = profile || DEFAULT_CANDIDATE;

  // Fetch applications
  useEffect(() => {
    if (!profile?.id) return;
    const q = query(collection(db, 'applications'), where('candidateId', '==', profile.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter for mutual matches or direct applications
      const filteredApps = apps.filter(a => 
        a.status === 'applied' || 
        (a.candidateExpressedInterest && a.employerExpressedInterest)
      );
      setDbApps(filteredApps);
    }, (err) => {
      console.error('CandApps: applications snapshot error', err);
    });
    return () => unsubscribe();
  }, [profile?.id]);

  // Fetch all live jobs to match with apps
  useEffect(() => {
    const q = query(collection(db, 'jobs'), where('status', '==', 'live'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDbJobs(jobs);
      setLoading(false);
    }, (err) => {
      console.error('CandApps: jobs snapshot error', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const apps = useMemo(() => {
    return dbApps.map(app => {
      const job = dbJobs.find(j => j.id === app.jobId);
      if (!job) return null;

      const scores = scoreJobForCandidate(candidate, job);
      const isMutual = app.candidateExpressedInterest && app.employerExpressedInterest;
      const isInterview = ['Round 1', 'Round 2', 'Pre-offer', 'Offer', 'interview', 'screen'].includes(app.stage?.toLowerCase()) || app.stage === 'Interview';
      
      const stages = ['all'];
      if (isMutual) stages.push('mutual');
      if (isInterview) stages.push('interview');

      const chips = [];
      if (isMutual) chips.push({ label: '🤝 Mutual match', cls: 'chip chip-t' });
      if (app.status === 'applied' && !isMutual) chips.push({ label: '⚡ Applied', cls: 'chip chip-p' });
      
      // Map pipeline stages to UI chips
      const stageLabels = {
        'screen': 'Screening',
        'interview': 'Interview',
        'Round 1': 'Round 1',
        'Round 2': 'Round 2',
        'Pre-offer': 'Pre-offer',
        'Offer': 'Offer'
      };
      if (app.stage && app.stage !== 'matched') {
        chips.push({ label: stageLabels[app.stage] || app.stage, cls: 'chip chip-c' });
      }

      return {
        id: app.id,
        jobId: job.id,
        stage: stages,
        emoji: job.emoji || '💼',
        title: job.title,
        chips,
        company: job.companyName || 'Unknown',
        employerId: job.employerId || app.employerId,
        score: `Hiro Score ${job.hiroScore || '8.0/10'}`,
        location: `${job.location || 'London'} · £${job.salMin || 0}–${job.salMax || 0}k`,
        stats: [
          { label: 'Skills', val: `${scores.skills}%`, color: scores.skills >= 80 ? 'var(--green)' : 'var(--amber)' },
          { label: '🧬', val: `${scores.dna}%`, color: '#f9a8d4' },
          { label: 'Updated', val: app.updatedAt?.toDate ? `${Math.floor((Date.now() - app.updatedAt.toDate()) / (1000 * 60 * 60 * 24))}d ago` : 'Just now', color: null },
        ],
        context: {
          bg: isInterview ? 'rgba(108,71,255,.07)' : 'rgba(255,255,255,.03)',
          border: isInterview ? 'rgba(108,71,255,.15)' : 'rgba(255,255,255,.07)',
          content: app.stage === 'Offer' ? (
            <>🎉 <strong style={{ color: '#fff' }}>You have an offer!</strong> — Review and respond to your offer details.</>
          ) : isInterview ? (
            <>📅 <strong style={{ color: '#fff' }}>Pipeline Update</strong> — You are currently in the {stageLabels[app.stage] || app.stage} stage.</>
          ) : (
            <>🤝 <strong style={{ color: '#fff' }}>Mutual Match</strong> — You and the employer are both interested. Start a conversation!</>
          ),
        },
        borderColor: isMutual ? 'rgba(13,148,136,.3)' : null,
        actions: [
          app.stage === 'Offer' 
            ? { label: '🏆 Review Offer', cls: 'btn btn-violet btn-sm', action: () => setNegotiatingJobId(job.id) }
            : { label: <><span className="ico ico-vault" style={{ width: 12, height: 12, background: '#fff', marginRight: 4, verticalAlign: 'middle', display: 'inline-block' }} />Prep with Vault →</>, cls: 'btn btn-violet btn-sm', route: 'cand-vault' },
          { label: <><span className="ico ico-chat" style={{ width: 12, height: 12, background: 'var(--text2)', marginRight: 4, verticalAlign: 'middle', display: 'inline-block' }} />Messages</>, cls: 'btn btn-ghost btn-sm', route: 'cand-messages' },
          { label: '🏢 View company', cls: 'btn btn-ghost btn-sm', route: 'cand-company' },
        ],
      };
    }).filter(Boolean);
  }, [dbApps, dbJobs, candidate]);

  const tabs = useMemo(() => [
    { key: 'all', label: 'All', count: apps.length, countStyle: { background: 'rgba(255,255,255,.08)', color: undefined } },
    { key: 'mutual', label: 'Mutual', count: apps.filter(a => a.stage.includes('mutual')).length, countStyle: { background: 'rgba(13,148,136,.2)', color: 'var(--teal)' } },
    { key: 'interview', label: 'Interview', count: apps.filter(a => a.stage.includes('interview')).length, countStyle: { background: 'rgba(108,71,255,.2)', color: '#a78bfa' } },
  ], [apps]);

  const statTiles = useMemo(() => [
    { eyebrow: 'Mutual matches', val: apps.filter(a => a.stage.includes('mutual')).length.toString(), label: 'Active dialogue', valColor: 'var(--teal)', glow: 'rgba(13,148,136,.25)' },
    { eyebrow: 'Interviews', val: apps.filter(a => a.stage.includes('interview')).length.toString(), label: 'In pipeline', valColor: '#a78bfa', glow: 'rgba(108,71,255,.25)' },
    { eyebrow: 'Response rate', val: '100%', label: 'All messages answered', valColor: 'var(--green)', glow: 'rgba(34,197,94,.2)' },
    { eyebrow: 'Expressed interest', val: dbApps.filter(a => a.candidateExpressedInterest && !a.employerExpressedInterest).length.toString(), label: 'Awaiting match', valColor: 'var(--amber)', glow: 'rgba(245,158,11,.2)' },
  ], [apps, dbApps]);

  const visible = apps.filter(a => activeTab === 'all' || a.stage.includes(activeTab));

  if (loading && dbApps.length === 0) {
    return (
      <div className="view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text3)' }}>Loading applications...</div>
      </div>
    );
  }

  return (
    <div className="view active" style={{ flexDirection: 'column' }}>
      <div className="scroll">
        <div style={{ maxWidth: 820 }}>

          {/* Header */}
          <div className="page-hdr" style={{ marginBottom: 16 }}>
            <div>
              <div className="eyebrow">Candidate · {profile?.full_name || 'Jordan Mitchell'}</div>
              <div className="page-title">Applications</div>
              <div className="page-sub">Your active pipeline across all live opportunities.</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('cand-jobs')}>Browse more →</button>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,.07)' }}>
            {tabs.map(t => (
              <div
                key={t.key}
                className={`notif-tab${activeTab === t.key ? ' active' : ''}`}
                style={{ fontSize: 12 }}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}{' '}
                <span style={{
                  padding: '1px 5px',
                  background: t.countStyle.background,
                  borderRadius: 999,
                  fontSize: 10,
                  marginLeft: 3,
                  color: t.countStyle.color,
                }}>{t.count}</span>
              </div>
            ))}
          </div>

          {/* Stat tiles */}
          <div className="g4" style={{ marginBottom: 18 }}>
            {statTiles.map(tile => (
              <div key={tile.eyebrow} className="stat-tile" style={{ '--glow': tile.glow }}>
                <div className="stat-eyebrow">{tile.eyebrow}</div>
                <div className="stat-val" style={{ color: tile.valColor }}>{tile.val}</div>
                <div className="stat-label">{tile.label}</div>
              </div>
            ))}
          </div>

          {/* App cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} id="appsList">
            {visible.length > 0 ? visible.map(app => (
              <div
                key={app.id}
                className="card"
                style={app.borderColor ? { borderColor: app.borderColor } : undefined}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Logo */}
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(14,17,36,.9)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {app.emoji}
                  </div>

                  <div style={{ flex: 1 }}>
                    {/* Title row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{app.title}</div>
                      {app.chips.map((chip, i) => (
                        chip.cls
                          ? <span key={i} className={chip.cls} style={{ fontSize: 10 }}>{chip.label}</span>
                          : <span key={i} style={chip.custom}>{chip.label}</span>
                      ))}
                    </div>

                    {/* Company + score */}
                    <div style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600, marginBottom: 5 }}>
                      <span 
                        onClick={() => {
                          if (app.employerId) {
                            setSelectedEmployerId(app.employerId);
                            navigate('cand-company');
                          }
                        }}
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {app.company}
                      </span> · <span style={{ color: '#a78bfa' }}>{app.score}</span> · {app.location}
                    </div>

                    {/* Match stats */}
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
                      {app.stats.map((s, i) => (
                        <span key={i}>
                          {s.label} {s.color
                            ? <strong style={{ color: s.color }}>{s.val}</strong>
                            : <><strong>{s.val}</strong></>
                          }
                        </span>
                      ))}
                    </div>

                    {/* Stage context */}
                    <div style={{ padding: '10px 12px', borderRadius: 'var(--r)', background: app.context.bg, border: `1px solid ${app.context.border}`, fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
                      {app.context.content}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                      {app.actions.map((action, i) => (
                        <button 
                          key={i} 
                          className={action.cls} 
                          onClick={() => {
                            if (action.action) {
                              action.action();
                              return;
                            }
                            if (action.route === 'cand-company' && app.employerId) {
                              setSelectedEmployerId(app.employerId);
                            }
                            navigate(action.route);
                          }}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text3)', background: 'var(--bg2)', borderRadius: 'var(--r)', border: '1px dashed var(--border)' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>💼</div>
                <div style={{ fontWeight: 700, color: '#fff', marginBottom: 4 }}>No active applications</div>
                <div style={{ fontSize: 13 }}>Jobs you apply for or mutually match with will appear here.</div>
                <button className="btn btn-violet btn-sm" style={{ marginTop: 16 }} onClick={() => navigate('cand-jobs')}>Browse Jobs</button>
              </div>
            )}
          </div>

        </div>
      </div>
      {negotiatingJobId && (
        <CandOfferNegotiationModal 
          candId={profile?.id} 
          jobId={negotiatingJobId} 
          onClose={() => setNegotiatingJobId(null)} 
        />
      )}
    </div>
  );
}
