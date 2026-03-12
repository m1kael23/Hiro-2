import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, setDoc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useApp } from '../../context/AppContext';
import { scoreCandidateForJob } from '../../lib/matchStore';

// ── Candidate-view preview modal ─────────────────────────────────
function JobPreviewModal({ job, onClose }) {
  if (!job) return null;
  const perksMap = { health: 'Health insurance', ld: 'L&D budget', parental: 'Parental leave', pto: 'Unlimited PTO', homeoffice: 'Home office stipend', gym: 'Gym membership' };
  const activePerks = job.perks ? Object.entries(job.perks).filter(([, v]) => v).map(([k]) => perksMap[k] || k) : [];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.7)' }}>
      <div style={{ width: 600, maxWidth: '95vw', maxHeight: '90vh', background: '#0d1020', border: '1px solid rgba(255,255,255,.12)', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,.7)' }}>
        {/* Header */}
        <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'rgba(108,71,255,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{job.emoji || '🚀'}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{job.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Candidate view preview</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 8, width: 32, height: 32, color: 'var(--text2)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>
          {/* Role header */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{job.title}</div>
              <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: 'rgba(34,197,94,.15)', color: 'var(--green)', border: '1px solid rgba(34,197,94,.3)', fontWeight: 600 }}>● Actively hiring</span>
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13, color: 'var(--text2)' }}>
              <span>🏢 {job.companyName}</span>
              <span>📍 {job.location}</span>
              <span>🏠 {job.remote}</span>
              <span>💼 {job.seniority}</span>
              <span>🏛 {job.department}</span>
            </div>
          </div>

          {/* Salary & equity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border2)' }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Compensation</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{job.currency || '£'}{job.salMin}k – {job.currency || '£'}{job.salMax}k</div>
              {job.bonus && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>+ {job.bonus} bonus</div>}
            </div>
            {job.equityMin && (
              <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border2)' }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Equity</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#a78bfa' }}>{job.equityMin}%+</div>
                {job.cliffVest && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{job.cliffVest}</div>}
              </div>
            )}
          </div>

          {/* What you'll do */}
          {(job.outcome6m || job.outcome12m) && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text3)', marginBottom: 10 }}>What you'll do</div>
              {job.outcome6m && (
                <div style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--violet)', fontWeight: 700, marginBottom: 4 }}>First 6 months</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{job.outcome6m}</div>
                </div>
              )}
              {job.outcome12m && (
                <div style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--cyan)', fontWeight: 700, marginBottom: 4 }}>12 month vision</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{job.outcome12m}</div>
                </div>
              )}
            </div>
          )}

          {/* Challenge */}
          {job.challenge && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text3)', marginBottom: 8 }}>The challenge</div>
              <div style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(245,158,11,.05)', border: '1px solid rgba(245,158,11,.2)', fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{job.challenge}</div>
            </div>
          )}

          {/* Skills */}
          {job.mustSkills && job.mustSkills.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text3)', marginBottom: 8 }}>Skills we're looking for</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {job.mustSkills.map(s => <span key={s} style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(108,71,255,.12)', border: '1px solid rgba(108,71,255,.3)', fontSize: 12, color: '#a78bfa' }}>{s}</span>)}
              </div>
            </div>
          )}

          {/* Perks */}
          {activePerks.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text3)', marginBottom: 8 }}>Benefits & perks</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {activePerks.map(p => <span key={p} style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', fontSize: 12, color: 'var(--green)' }}>✓ {p}</span>)}
                {(job.customPerks || []).map(p => <span key={p} style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', fontSize: 12, color: 'var(--green)' }}>✓ {p}</span>)}
              </div>
            </div>
          )}

          {/* Relocation */}
          {job.relocation && job.relocation !== 'None' && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(56,189,248,.05)', border: '1px solid rgba(56,189,248,.2)', fontSize: 13, color: 'var(--cyan)' }}>
              📦 Relocation support available — {job.relocation}
            </div>
          )}
        </div>

        {/* Footer — candidate CTA (disabled preview) */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 10, flexShrink: 0, background: 'rgba(255,255,255,.02)' }}>
          <div style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: 'rgba(108,71,255,.08)', border: '1px solid rgba(108,71,255,.2)', fontSize: 12, color: '#a78bfa' }}>
            👆 This is exactly what candidates see when browsing roles
          </div>
          <button onClick={onClose} className="btn btn-ghost">Close preview</button>
        </div>
      </div>
    </div>
  );
}

export default function EmpJobs() {
  const { navigate, showToast } = useApp();
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [previewJob, setPreviewJob] = useState(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const qJobs = query(collection(db, 'jobs'), where('employerId', '==', auth.currentUser.uid), orderBy('createdAt', 'desc'));
    const unsubJobs = onSnapshot(qJobs, (snapshot) => {
      const jobs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setJobs(jobs);

      // Auto-archive: if status==='closed' and closedAt > 30 days ago, set archived
      jobs.forEach(async job => {
        if (job.status === 'closed' && job.closedAt) {
          const closedDate = job.closedAt.toDate ? job.closedAt.toDate() : new Date(job.closedAt);
          const daysAgo = (Date.now() - closedDate.getTime()) / 86400000;
          if (daysAgo >= 30) {
            await setDoc(doc(db, 'jobs', job.id), { status: 'archived', archivedAt: serverTimestamp() }, { merge: true });
          }
        }
      });
    }, (err) => {
      console.error('EmpJobs: jobs snapshot error', err);
    });

    const qCands = query(collection(db, 'users'), where('type', '==', 'candidate'));
    const unsubCands = onSnapshot(qCands, s => { setCandidates(s.docs.map(d => ({ id: d.id, ...d.data() }))); }, (err) => {
      console.error('EmpJobs: candidates snapshot error', err);
    });

    const qApps = query(collection(db, 'applications'), where('employerId', '==', auth.currentUser.uid));
    const unsubApps = onSnapshot(qApps, s => { setApplications(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }, (err) => {
      console.error('EmpJobs: applications snapshot error', err);
      setLoading(false);
    });

    return () => { unsubJobs(); unsubCands(); unsubApps(); };
  }, []);

  const filteredJobs = jobs.filter(job => {
    if (statusFilter === 'All statuses') return true;
    return job.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const liveCount = jobs.filter(j => j.status === 'live').length;

  const updateJobStatus = async (jobId, newStatus) => {
    try {
      const update = { status: newStatus, updatedAt: serverTimestamp() };
      if (newStatus === 'closed') update.closedAt = serverTimestamp();
      if (newStatus === 'archived') update.archivedAt = serverTimestamp();
      await setDoc(doc(db, 'jobs', jobId), update, { merge: true });
      showToast(`Role ${newStatus}`, 'success');
    } catch (e) {
      showToast('Failed to update status', 'error');
    }
  };

  const jobInsights = useMemo(() => {
    const insights = {};
    jobs.forEach(job => {
      const jobApps = applications.filter(a => a.jobId === job.id);
      const expressed = jobApps.filter(a => a.candidateExpressedInterest).length;
      const mutuals = jobApps.filter(a => a.candidateExpressedInterest && a.employerExpressedInterest).length;
      const scoredCands = candidates.map(c => ({ ...c, scores: scoreCandidateForJob(c, job) })).filter(c => c.scores.overall >= 70);
      const matched = scoredCands.length;
      const interestRateVal = expressed > 0 ? ((mutuals / expressed) * 100).toFixed(1) : 0;
      const avgDnaFit = scoredCands.length ? Math.round(scoredCands.reduce((s, c) => s + c.scores.dna, 0) / scoredCands.length) : 0;
      insights[job.id] = { interestRate: `${interestRateVal}%`, dnaFit: `${avgDnaFit}%`, mutuals, matched, expressed, platformAvg: '9.2%' };
    });
    return insights;
  }, [jobs, candidates, applications]);

  const totalMutuals = Object.values(jobInsights).reduce((acc, ins) => acc + ins.mutuals, 0);

  function getDaysUntilArchive(job) {
    if (job.status !== 'closed' || !job.closedAt) return null;
    const closedDate = job.closedAt.toDate ? job.closedAt.toDate() : new Date(job.closedAt);
    const daysAgo = (Date.now() - closedDate.getTime()) / 86400000;
    return Math.max(0, Math.ceil(30 - daysAgo));
  }

  return (
    <div className="view">
      <div className="scroll">
        <div className="page-hdr" style={{ maxWidth: 900 }}>
          <div>
            <div className="eyebrow">{liveCount} active roles · {jobs.length} total roles</div>
            <div className="page-title">Jobs</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="sel" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option>All statuses</option><option>Live</option><option>Paused</option><option>Closed</option><option>Archived</option><option>Draft</option>
            </select>
            <button className="btn btn-violet btn-sm" onClick={() => navigate('emp-create-job')}>+ Post role</button>
          </div>
        </div>

        <div className="g4" style={{ maxWidth: 900, marginBottom: 18 }}>
          <div className="stat-tile" style={{ '--glow': 'rgba(34,197,94,.25)' }}>
            <div className="stat-eyebrow">Live roles</div>
            <div className="stat-val" style={{ color: 'var(--green)' }}>{liveCount}</div>
            <div className="stat-label">Actively matching</div>
          </div>
          <div className="stat-tile" style={{ '--glow': 'rgba(108,71,255,.3)' }}>
            <div className="stat-eyebrow">Total roles</div>
            <div className="stat-val" style={{ color: '#a78bfa' }}>{jobs.length}</div>
            <div className="stat-label">Across all statuses</div>
          </div>
          <div className="stat-tile" style={{ '--glow': 'rgba(56,189,248,.25)' }}>
            <div className="stat-eyebrow">Mutual interest</div>
            <div className="stat-val" style={{ color: 'var(--cyan)' }}>{totalMutuals}</div>
            <div className="stat-label">Ready to contact</div>
          </div>
          <div className="stat-tile" style={{ '--glow': 'rgba(245,158,11,.2)' }}>
            <div className="stat-eyebrow">Avg time to match</div>
            <div className="stat-val" style={{ color: 'var(--amber)' }}>4.2d</div>
            <div className="stat-label">Since posting</div>
          </div>
        </div>

        <div style={{ maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading jobs...</div>
          ) : filteredJobs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', background: 'var(--bg2)', borderRadius: 'var(--rl)' }}>
              No jobs found. <button className="btn btn-link" onClick={() => navigate('emp-create-job')}>Post your first role →</button>
            </div>
          ) : filteredJobs.map(job => {
            const insights = jobInsights[job.id] || { matched: 0, expressed: 0, mutuals: 0, interestRate: '0%', dnaFit: '0%', platformAvg: '9.2%' };
            const daysLeft = getDaysUntilArchive(job);

            return (
              <div key={job.id} style={{
                borderRadius: 'var(--rl)',
                border: job.status === 'live' ? '1px solid rgba(34,197,94,.25)' : job.status === 'closed' ? '1px solid rgba(245,158,11,.25)' : '1px solid var(--border2)',
                background: job.status === 'live' ? 'rgba(34,197,94,.04)' : job.status === 'closed' ? 'rgba(245,158,11,.03)' : 'rgba(255,255,255,.02)',
                padding: '18px 20px',
                opacity: job.status === 'draft' ? 0.75 : 1
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 5 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{job.title}</div>
                      <span className={`status ${job.status === 'live' ? 's-live' : ''}`} style={job.status !== 'live' ? { background: job.status === 'closed' ? 'rgba(245,158,11,.12)' : 'rgba(255,255,255,.08)', border: `1px solid ${job.status === 'closed' ? 'rgba(245,158,11,.4)' : 'var(--border2)'}`, color: job.status === 'closed' ? 'var(--amber)' : 'var(--text3)' } : {}}>
                        {job.status === 'live' && <span className="pulse-dot"></span>}
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                      {job.relocation !== 'None' && <span className="chip chip-c" style={{ fontSize: 10 }}>📦 Relocation</span>}
                      <span className="chip chip-x" style={{ fontSize: 10 }}>🧬 DNA scoring on</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
                      {job.location} · {job.remote} · {job.salMin && job.salMax ? `${job.currency || '£'}${job.salMin}–${job.currency || '£'}${job.salMax}` : 'Salary TBD'} · {job.department} · {job.createdAt?.toDate ? `Posted ${new Date(job.createdAt.toDate()).toLocaleDateString()}` : 'Just now'}
                    </div>

                    {job.status === 'live' && (
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {[[insights.matched, 'Matched', '#a78bfa'], [insights.expressed, 'Expressed interest', 'var(--cyan)'], [insights.mutuals, 'Mutual', 'var(--green)'], [insights.interestRate, 'Interest rate', 'var(--amber)'], [insights.dnaFit, 'Avg DNA fit', '#ec4899']].map(([val, label, color]) => (
                          <div key={label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color }}>{val}</div>
                            <div style={{ fontSize: 10, color: 'var(--text3)' }}>{label}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {job.status === 'closed' && daysLeft !== null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${((30 - daysLeft) / 30) * 100}%`, borderRadius: 999, background: daysLeft <= 7 ? '#f87171' : 'var(--amber)' }} />
                        </div>
                        <span style={{ fontSize: 11, color: daysLeft <= 7 ? '#f87171' : 'var(--amber)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {daysLeft}d until auto-archive
                        </span>
                      </div>
                    )}

                    {job.status === 'archived' && <div style={{ fontSize: 12, color: 'var(--text3)' }}>Archived — role is no longer visible to candidates</div>}
                    {job.status === 'draft' && <div style={{ fontSize: 12, color: 'var(--text3)' }}>Not published — complete the role description to go live</div>}
                    {job.status === 'paused' && <div style={{ fontSize: 12, color: 'var(--text3)' }}>This role is paused and not visible to candidates</div>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    {/* Preview button always available */}
                    <button className="btn btn-ghost btn-sm" onClick={() => setPreviewJob(job)}>👁 Preview</button>

                    {job.status === 'live' && <>
                      <button className="btn btn-violet btn-sm" onClick={() => navigate('emp-pipeline')}>View pipeline →</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate('emp-create-job')}>Edit role</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => updateJobStatus(job.id, 'paused')}>Pause</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => updateJobStatus(job.id, 'archived')}>Archive</button>
                    </>}
                    {job.status === 'draft' && <button className="btn btn-violet btn-sm" onClick={() => navigate('emp-create-job')}>Complete & publish →</button>}
                    {job.status === 'paused' && <>
                      <button className="btn btn-violet btn-sm" onClick={() => updateJobStatus(job.id, 'live')}>Resume role</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => updateJobStatus(job.id, 'archived')}>Archive</button>
                    </>}
                    {job.status === 'closed' && <>
                      <button className="btn btn-ghost btn-sm" onClick={() => updateJobStatus(job.id, 'live')}>Reopen role</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => updateJobStatus(job.id, 'archived')}>Archive now</button>
                    </>}
                    {job.status === 'archived' && <button className="btn btn-ghost btn-sm" onClick={() => updateJobStatus(job.id, 'live')}>Restore</button>}
                  </div>
                </div>

                {job.status === 'live' && (
                  <div style={{ marginTop: 12, padding: '8px 14px', borderRadius: 'var(--r)', background: 'rgba(108,71,255,.08)', border: '1px solid rgba(108,71,255,.2)', fontSize: 12, color: 'var(--text2)' }}>
                    <strong style={{ color: '#a78bfa' }}>⚡ Hiro insight:</strong> Interest rate {insights.interestRate} vs {insights.platformAvg} platform avg. DNA fit averaging {insights.dnaFit} — top quartile. Consider reviewing the {insights.mutuals} mutuals today.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {previewJob && <JobPreviewModal job={previewJob} onClose={() => setPreviewJob(null)} />}
    </div>
  );
}
