import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export default function EmpCompany() {
  const { navigate, showToast } = useApp();
  const { profile, updateProfile } = useAuth();
  const [companyName, setCompanyName] = useState(profile?.company_name || 'Monzo');
  const [tagline, setTagline] = useState(profile?.tagline || 'Making money work for everyone');
  const [about, setAbout] = useState(profile?.company_description || 'Digital bank on a mission to make money work for everyone. 9M+ customers across UK and EU.');
  const [stage, setStage] = useState(profile?.company_stage || 'Series C');
  const [size, setSize] = useState(profile?.company_size || '1,001–5,000');
  const [hq, setHq] = useState(profile?.hq_location || 'London, UK');
  const [visa, setVisa] = useState(profile?.visa_sponsorship ?? true);
  const [logoUrl, setLogoUrl] = useState(profile?.logo_url || '');
  const [culturePhotos, setCulturePhotos] = useState(profile?.culture_photos || []);
  const [website, setWebsite] = useState(profile?.website || '');
  const [industry, setIndustry] = useState(profile?.industry || '');
  const [cultureTags, setCultureTags] = useState(profile?.culture_tags || []);
  const [workModel, setWorkModel] = useState(profile?.work_model || '');
  const [intensity, setIntensity] = useState(profile?.intensity_level || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      if (profile.company_name) setCompanyName(profile.company_name);
      if (profile.tagline) setTagline(profile.tagline);
      if (profile.company_description) setAbout(profile.company_description);
      if (profile.company_stage) setStage(profile.company_stage);
      if (profile.company_size) setSize(profile.company_size);
      if (profile.hq_location) setHq(profile.hq_location);
      if (profile.visa_sponsorship !== undefined) setVisa(profile.visa_sponsorship);
      if (profile.logo_url) setLogoUrl(profile.logo_url);
      if (profile.culture_photos) setCulturePhotos(profile.culture_photos);
      if (profile.website) setWebsite(profile.website);
      if (profile.industry) setIndustry(profile.industry);
      if (profile.culture_tags) setCultureTags(profile.culture_tags);
      if (profile.work_model) setWorkModel(profile.work_model);
      if (profile.intensity_level) setIntensity(profile.intensity_level);
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        company_name: companyName,
        tagline,
        company_description: about,
        company_stage: stage,
        company_size: size,
        hq_location: hq,
        visa_sponsorship: visa,
        logo_url: logoUrl,
        culture_photos: culturePhotos,
        website,
        industry,
        culture_tags: cultureTags,
        work_model: workModel,
        intensity_level: intensity
      });
      showToast('Profile changes saved ✓', 'success');
    } catch (error) {
      console.error('Error saving profile:', error);
      showToast('Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('File too large (max 2MB)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'logo') {
        setLogoUrl(reader.result);
      } else if (type === 'culture') {
        setCulturePhotos(prev => [...prev, reader.result].slice(0, 6));
      }
    };
    reader.readAsDataURL(file);
  };

  const removeCulturePhoto = (index) => {
    setCulturePhotos(prev => prev.filter((_, i) => i !== index));
  };

  const SCORE_BARS = [
    { label: 'Culture', val: '9.0', pct: 90 },
    { label: 'Transparency', val: '8.5', pct: 85 },
    { label: 'Candidate UX', val: '8.8', pct: 88 },
    { label: 'DNA depth', val: '8.4', pct: 84 },
    { label: 'Response rate', val: '9.4', pct: 94 },
  ];

  return (
    <div className="view">
      <div className="scroll">
        <div className="page-hdr" style={{ maxWidth: 900 }}>
          <div>
            <div className="eyebrow">Employer brand · visible to all candidates</div>
            <div className="page-title">Company profile</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => showToast('Preview opened in new tab', 'default')}>Preview →</button>
            <button className="btn btn-violet btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>

        <div className="g2" style={{ maxWidth: 900 }}>
          <div>
            {/* Identity card */}
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">Identity</div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
                <div 
                  style={{ 
                    width: 64, 
                    height: 64, 
                    borderRadius: 16, 
                    background: logoUrl ? `url(${logoUrl}) center/cover no-repeat` : 'linear-gradient(135deg,#3b82f6,#1d4ed8)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: logoUrl ? 0 : 28, 
                    flexShrink: 0, 
                    cursor: 'pointer',
                    border: '1px solid var(--border2)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onClick={() => document.getElementById('logo-upload').click()}
                >
                  {!logoUrl && '🏦'}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 8, textAlign: 'center', padding: '2px 0' }}>Edit</div>
                </div>
                <input id="logo-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileUpload(e, 'logo')} />
                <div style={{ flex: 1 }}>
                  <div className="field"><label>Company name</label><input className="inp" value={companyName} onChange={e => setCompanyName(e.target.value)} /></div>
                  <div className="field" style={{ marginTop: 8 }}><label>Tagline</label><input className="inp" value={tagline} onChange={e => setTagline(e.target.value)} /></div>
                </div>
              </div>
              <div className="g2f">
                <div className="field"><label>Stage</label><select className="sel" value={stage} onChange={e => setStage(e.target.value)}><option>Seed</option><option>Series A</option><option>Series B</option><option>Series C</option><option>Pre-IPO</option><option>Public</option></select></div>
                <div className="field"><label>Company size</label><select className="sel" value={size} onChange={e => setSize(e.target.value)}><option>1–50</option><option>51–200</option><option>201–500</option><option>501–1,000</option><option>1,001–5,000</option><option>5,000+</option></select></div>
                <div className="field"><label>HQ</label><input className="inp" value={hq} onChange={e => setHq(e.target.value)} /></div>
                <div className="field"><label>Website</label><input className="inp" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://monzo.com" /></div>
                <div className="field"><label>Industry</label><input className="inp" value={industry} onChange={e => setIndustry(e.target.value)} /></div>
                <div className="field"><label>Work model</label><input className="inp" value={workModel} onChange={e => setWorkModel(e.target.value)} /></div>
                <div className="field"><label>Intensity level</label><input className="inp" value={intensity} onChange={e => setIntensity(e.target.value)} /></div>
              </div>
              <div className="field" style={{ marginTop: 8 }}>
                <label>About</label>
                <textarea className="inp textarea" rows={3} value={about} onChange={e => setAbout(e.target.value)} />
              </div>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                  <input type="checkbox" checked={visa} onChange={e => setVisa(e.target.checked)} style={{ accentColor: 'var(--violet)' }} />
                  Offers visa sponsorship
                </label>
              </div>
            </div>

            {/* Culture tags */}
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">Culture &amp; values</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {cultureTags.map(t => <span key={t} className="chip chip-p">{t} ✕</span>)}
                <button className="btn btn-ghost btn-sm" onClick={() => showToast('Tag editor opened', 'default')}>+ Add tag</button>
              </div>
              <div className="field">
                <label>Mission statement (optional)</label>
                <textarea className="inp textarea" rows={2} placeholder="What problem do you exist to solve?" />
              </div>
            </div>

            {/* Culture photos */}
            <div className="card">
              <div className="card-title">Culture photos</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {culturePhotos.map((url, i) => (
                  <div key={i} style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--border2)' }}>
                    <img src={url} alt={`Culture ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                      onClick={() => removeCulturePhoto(i)}
                      style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}
                    >✕</button>
                  </div>
                ))}
                {culturePhotos.length < 6 && (
                  <div 
                    onClick={() => document.getElementById('culture-upload').click()} 
                    style={{ aspectRatio: '4/3', borderRadius: 'var(--r)', border: '2px dashed var(--border2)', background: 'rgba(255,255,255,.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', fontSize: 12, color: 'var(--text3)' }}
                  >
                    <span style={{ fontSize: 20 }}>📷</span>
                    <span>Add photo</span>
                  </div>
                )}
                <input id="culture-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileUpload(e, 'culture')} />
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>Companies with 3+ photos see 41% more candidate engagement.</div>
            </div>
          </div>

          {/* RIGHT: Hiro Score + tips */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ borderRadius: 'var(--rl)', border: '1px solid rgba(245,158,11,.25)', background: 'linear-gradient(135deg,rgba(245,158,11,.06),rgba(108,71,255,.04))', padding: '18px 20px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', opacity: 0.6, marginBottom: 6 }}>Hiro Score™</div>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 44, fontWeight: 800, lineHeight: 1, marginBottom: 4 }}>8.6</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>Top 12% · updated monthly</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {SCORE_BARS.map(({ label, val, pct }) => (
                  <div key={label} className="score-bar-row">
                    <span className="score-bar-lbl" style={{ width: 100 }}>{label}</span>
                    <div className="score-bar-track"><div className="score-bar-fill" style={{ width: `${pct}%` }}></div></div>
                    <span className="score-bar-val">{val}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '9px 12px', borderRadius: 'var(--r)', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', fontSize: 12, color: 'var(--amber)' }}>
                Add 3 culture photos to push Score to <strong>8.9</strong> (+3 in Transparency)
              </div>
            </div>

            {/* Open roles */}
            <div className="card">
              <div className="card-title">Showing on profile</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ padding: '8px 10px', borderRadius: 'var(--r)', border: '1px solid rgba(34,197,94,.25)', background: 'rgba(34,197,94,.04)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="pulse-dot"></span>
                  <div style={{ flex: 1 }}>Sr PM — Payments</div>
                  <span style={{ color: 'var(--text3)', fontSize: 12 }}>£90–120k</span>
                </div>
                <div style={{ padding: '8px 10px', borderRadius: 'var(--r)', border: '1px solid rgba(34,197,94,.2)', background: 'rgba(34,197,94,.03)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="pulse-dot"></span>
                  <div style={{ flex: 1 }}>Lead Engineer</div>
                  <span style={{ color: 'var(--text3)', fontSize: 12 }}>£120–150k</span>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} onClick={() => navigate('emp-jobs')}>Manage roles →</button>
              </div>
            </div>

            {/* Profile completeness */}
            <div className="card">
              <div className="card-title">Profile completeness</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>
                <div style={{ color: 'var(--green)' }}>✓ Identity &amp; about</div>
                <div style={{ color: 'var(--green)' }}>✓ Culture tags</div>
                <div style={{ color: 'var(--green)' }}>✓ Benefits</div>
                <div style={{ color: 'var(--green)' }}>✓ Team DNA published</div>
                <div style={{ color: 'var(--amber)' }}>○ Culture photos (0/3)</div>
                <div style={{ color: 'var(--text3)' }}>○ Founder video (optional)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
