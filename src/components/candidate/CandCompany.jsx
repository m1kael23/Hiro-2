import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

export default function CandCompany() {
  const { navigate, selectedEmployerId } = useApp();
  const [tab, setTab] = useState('about');
  const [employer, setEmployer] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedEmployerId) { setLoading(false); return; }

    // Fetch employer profile — stored under auth UID, fields set by EmpCompany
    const fetchEmployer = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', selectedEmployerId));
        if (snap.exists()) setEmployer(snap.data());
      } catch (err) {
        console.error('Error fetching employer:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployer();

    // Live jobs
    const qJobs = query(collection(db, 'jobs'), where('employerId', '==', selectedEmployerId), where('status', '==', 'live'));
    const unsubJobs = onSnapshot(qJobs, s => setJobs(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    // Real reviews
    const qRev = query(collection(db, 'reviews'), where('employerId', '==', selectedEmployerId), where('visible', '==', true));
    const unsubRev = onSnapshot(qRev, s => setReviews(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubJobs(); unsubRev(); };
  }, [selectedEmployerId]);

  if (loading) {
    return (
      <div className="view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text3)' }}>Loading company profile...</div>
      </div>
    );
  }

  if (!employer) {
    return (
      <div className="view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
        <div style={{ color: 'var(--text3)' }}>Company profile not found.</div>
        <button className="btn btn-violet" onClick={() => navigate('cand-jobs')}>Back to jobs</button>
      </div>
    );
  }

  // ── Normalise field names: EmpCompany saves snake_case, CandCompany reads them ──
  const e = {
    name:         employer.company_name   || employer.companyName   || employer.full_name || 'Company',
    tagline:      employer.tagline        || '',
    about:        employer.company_description || employer.about    || '',
    stage:        employer.company_stage  || employer.stage         || 'Startup',
    size:         employer.company_size   || employer.employeeCount || '—',
    hq:           employer.hq_location   || employer.location      || 'Remote',
    visa:         employer.visa_sponsorship ?? employer.visa        ?? false,
    logo:         employer.logo_url       || employer.logoUrl       || '',
    website:      employer.website        || '',
    industry:     employer.industry       || '',
    workModel:    employer.work_model     || '',
    cultureTags:  employer.culture_tags   || [],
    culturePhotos:employer.culture_photos || [],
    emoji:        employer.emoji          || '🏢',
    // Scores — real if stored, otherwise derive from reviews
    hiroScore:    employer.hiroScore,
    interviewScore:    employer.interviewScore,
    cultureScore:      employer.cultureScore,
    transparencyScore: employer.transparencyScore,
    onboardingScore:   employer.onboardingScore,
  };

  // Derive scores from real reviews if not explicitly stored
  function avgField(field) {
    const vals = reviews.map(r => r[field]).filter(v => v > 0);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  }
  const derivedInterview    = avgField('interviewScore');
  const derivedCulture      = avgField('cultureScore');
  const derivedTransparency = avgField('transparencyScore');
  const derivedOnboarding   = avgField('onboardingScore');

  const scoreData = [
    [e.hiroScore       || '—',                          'var(--amber)', 'Hiro Score'],
    [e.interviewScore  || derivedInterview    || '—',   'var(--green)', 'Interview'],
    [e.cultureScore    || derivedCulture      || '—',   'var(--cyan)',  'Culture'],
    [e.transparencyScore || derivedTransparency || '—', '#a78bfa',     'Transparency'],
    [e.onboardingScore || derivedOnboarding   || '—',   '#2dd4bf',     'Onboarding'],
  ];

  const dnaPrefs  = employer.dnaPrefs || null;
  const dnaLabels = ['Energy','Decision','Feedback','Rhythm','Autonomy','Risk','Growth'];

  return (
    <div className="view">
    <div className="scroll">
      <div className="review-shell" style={{ maxWidth: 820, width: '100%' }}>

        {/* Cover */}
        <div style={{ height: 140, borderRadius: 'var(--rx) var(--rx) 0 0', background: 'linear-gradient(135deg,#1a0535,#0d1535,#001a35)', border: '1px solid var(--border2)', borderBottom: 'none', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%,rgba(108,71,255,.35),transparent 60%),radial-gradient(ellipse at 80% 50%,rgba(56,189,248,.2),transparent 55%)' }} />
          {/* Culture photos strip */}
          {e.culturePhotos.length > 0 && (
            <div style={{ position: 'absolute', right: 16, bottom: 16, display: 'flex', gap: 6 }}>
              {e.culturePhotos.slice(0, 4).map((p, i) => (
                <img key={i} src={p} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', border: '2px solid rgba(255,255,255,.15)' }} />
              ))}
            </div>
          )}
        </div>

        {/* Identity strip */}
        <div style={{ padding: '0 24px 20px', border: '1px solid var(--border2)', borderTop: 'none', borderRadius: '0 0 var(--rx) var(--rx)', background: 'var(--surface)', marginBottom: 18 }}>
          {/* FIX: added flexWrap, minWidth:0 to prevent banner deformation */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginTop: -28, marginBottom: 16, flexWrap: 'wrap', minWidth: 0 }}>
            <div style={{ width: 68, height: 68, borderRadius: 16, background: '#0d1020', border: '3px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: e.logo ? 0 : 36, flexShrink: 0, overflow: 'hidden' }}>
              {e.logo
                ? <img src={e.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : e.emoji}
            </div>
            {/* FIX: added minWidth:0 so this flex child can shrink properly */}
            <div style={{ paddingBottom: 6, flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 3, minWidth: 0 }}>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                <span className="verified-badge">✓ Verified employer</span>
                {e.hiroScore && <span className="company-badge" style={{ background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.25)', color: 'var(--amber)' }}>Hiro {e.hiroScore}/10</span>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.tagline && <span>{e.tagline} · </span>}
                {e.hq} · {e.stage} · {e.size} employees
                {e.industry && <span> · {e.industry}</span>}
              </div>
            </div>
            {/* FIX: added flexWrap so buttons don't overflow on narrow containers */}
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, paddingBottom: 6, flexWrap: 'wrap' }}>
              {e.website && <a href={e.website} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Website ↗</a>}
              <button className="btn btn-violet btn-sm" onClick={() => navigate('cand-jobs')}>Open roles ({jobs.length})</button>
            </div>
          </div>

          {/* Score strip */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', padding: '14px 0', borderTop: '1px solid var(--border)' }}>
            {scoreData.map(([v, c, l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: v === '—' ? 'var(--text3)' : c }}>{v}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{l}</div>
              </div>
            ))}
            <div style={{ marginLeft: 'auto', textAlign: 'right', paddingBottom: 4, alignSelf: 'flex-end' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{reviews.length} verified review{reviews.length !== 1 ? 's' : ''}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>From real Hiro hires only</div>
            </div>
          </div>

          {/* Culture tags */}
          {e.cultureTags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              {e.cultureTags.map(t => <span key={t} style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(108,71,255,.1)', border: '1px solid rgba(108,71,255,.2)', fontSize: 11, color: '#a78bfa' }}>{t}</span>)}
              {e.workModel && <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(56,189,248,.08)', border: '1px solid rgba(56,189,248,.2)', fontSize: 11, color: 'var(--cyan)' }}>{e.workModel}</span>}
            </div>
          )}
        </div>

        <div className="g2">
          {/* Main column */}
          <div>
            <div className="tab-row" style={{ marginBottom: 16 }}>
              {[['about','About'],['reviews',`Reviews (${reviews.length})`],['jobs',`Open roles (${jobs.length})`],['dna','Team DNA']].map(([id, label]) => (
                <div key={id} className={`tab-btn${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>{label}</div>
              ))}
            </div>

            {/* ── About ── */}
            {tab === 'about' && (
              <div>
                {e.about ? (
                  <div style={{ padding: '16px 18px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)', marginBottom: 14, fontSize: 14, color: 'var(--text2)', lineHeight: 1.75 }}>{e.about}</div>
                ) : (
                  <div style={{ color: 'var(--text3)', padding: '20px 0', fontSize: 13 }}>No company description provided yet.</div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {[['Stage', e.stage], ['Employees', e.size], ['HQ', e.hq], ['Visa sponsor', e.visa ? '✓ Yes' : '✗ No'], ...(e.industry ? [['Industry', e.industry]] : []), ...(e.workModel ? [['Work model', e.workModel]] : [])].map(([k, v]) => (
                    <div key={k} style={{ padding: '10px 14px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.1em' }}>{k}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: v === '✓ Yes' ? 'var(--green)' : v === '✗ No' ? '#f87171' : '#fff' }}>{v}</div>
                    </div>
                  ))}
                </div>

                {e.culturePhotos.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text3)', marginBottom: 8 }}>Culture photos</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {e.culturePhotos.map((p, i) => <img key={i} src={p} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Reviews ── */}
            {tab === 'reviews' && (
              <div>
                {reviews.length === 0 ? (
                  <div style={{ color: 'var(--text3)', padding: '40px 0', textAlign: 'center', fontSize: 13 }}>No reviews yet — reviews appear after verified Hiro hires.</div>
                ) : (
                  reviews.map(r => (
                    <div key={r.id} className="review-card" style={{ marginBottom: 10 }}>
                      <div className="rc-hdr">
                        <div className="rc-av" style={{ background: 'linear-gradient(135deg,#374151,#1f2937)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 14 }}>👤</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div className="rc-name">{r.anonymous ? 'Anonymous hire' : (r.authorName || 'Verified hire')}</div>
                            <span className="verified-badge">✓ Verified</span>
                          </div>
                          <div className="rc-role">{r.role || ''} · {r.createdAt?.toDate ? new Date(r.createdAt.toDate()).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : ''}</div>
                        </div>
                        <div className="rc-stars" style={{ color: 'var(--amber)' }}>
                          {'★'.repeat(Math.round(r.overallScore || 5))}
                          <span style={{ opacity: .3 }}>{'★'.repeat(5 - Math.round(r.overallScore || 5))}</span>
                        </div>
                      </div>
                      {r.text && <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 8 }}>"{r.text}"</div>}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {r.interviewScore && <span className="chip chip-g">Interview {r.interviewScore}/5</span>}
                        {r.cultureScore && <span className="chip chip-c">Culture {r.cultureScore}/5</span>}
                        {r.onboardingScore && <span className="chip chip-v">Onboarding {r.onboardingScore}/5</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Open roles ── */}
            {tab === 'jobs' && (
              <div>
                {jobs.length === 0 ? (
                  <div style={{ color: 'var(--text3)', padding: '40px 0', textAlign: 'center', fontSize: 13 }}>No open roles at the moment.</div>
                ) : jobs.map(j => (
                  <div key={j.id} className="card2" style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => navigate('cand-jobs')}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{j.title}</div>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{j.remote}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{j.location} · {j.currency || '£'}{j.salMin}–{j.salMax}k · {j.seniority}</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <span className="chip chip-x">{j.department}</span>
                      {j.mustSkills?.slice(0, 3).map(s => <span key={s} className="chip chip-v" style={{ fontSize: 10 }}>{s}</span>)}
                      {j.relocation && j.relocation !== 'None' && <span className="chip chip-c" style={{ fontSize: 10 }}>📦 Reloc</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Team DNA ── */}
            {tab === 'dna' && (
              <div>
                {dnaPrefs ? (
                  <div className="card" style={{ borderColor: 'rgba(236,72,153,.2)', marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: '#f9a8d4', marginBottom: 12 }}>🧬 {e.name} Team DNA</div>
                    {dnaPrefs.map((val, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text3)', width: 72, flexShrink: 0 }}>{dnaLabels[i]}</span>
                        <div style={{ flex: 1, height: 5, borderRadius: 999, background: 'rgba(255,255,255,.07)', position: 'relative' }}>
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${val}%`, borderRadius: 999, background: 'var(--violet)', opacity: .8 }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', width: 28, textAlign: 'right' }}>{val}</span>
                      </div>
                    ))}
                    {e.cultureTags.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                        {e.cultureTags.map(t => <span key={t} className="chip chip-p">{t}</span>)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text3)', padding: '40px 0', textAlign: 'center', fontSize: 13 }}>Team DNA not yet configured by this employer.</div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            {/* Score breakdown */}
            <div className="card2" style={{ marginBottom: 10, borderColor: 'rgba(245,158,11,.25)', background: 'linear-gradient(135deg,rgba(245,158,11,.06),rgba(108,71,255,.04))' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--amber)', marginBottom: 10 }}>Score breakdown</div>
              {[
                ['Interview',          e.interviewScore    || derivedInterview    || 0],
                ['Culture accuracy',   e.cultureScore      || derivedCulture      || 0],
                ['Offer transparency', e.transparencyScore || derivedTransparency || 0],
                ['Onboarding',         e.onboardingScore   || derivedOnboarding   || 0],
              ].map(([l, v]) => (
                <div key={l} className="score-bar-row">
                  <span className="score-bar-lbl" style={{ width: 120 }}>{l}</span>
                  <div className="score-bar-track"><div className="score-bar-fill" style={{ width: v ? `${Number(v) * 10}%` : '0%' }} /></div>
                  <span className="score-bar-val">{v ? Number(v).toFixed(1) : '—'}</span>
                </div>
              ))}
              {reviews.length === 0 && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>Scores calculated from verified hires.</div>}
            </div>

            {/* Quick facts */}
            <div className="card2">
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--text3)', marginBottom: 8 }}>About {e.name}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                {[
                  ['Stage', e.stage],
                  ['Employees', e.size],
                  ['HQ', e.hq],
                  ['Open roles', jobs.length],
                  ['Visa sponsor', e.visa ? '✓ Yes' : '✗ No'],
                  ...(e.website ? [['Website', e.website]] : []),
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 5, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                    <span style={{ color: 'var(--text3)' }}>{k}</span>
                    <span style={{ color: v === '✓ Yes' ? 'var(--green)' : v === '✗ No' ? '#f87171' : 'var(--text2)', fontWeight: 500 }}>
                      {k === 'Website' ? <a href={v} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>↗ Visit</a> : v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
