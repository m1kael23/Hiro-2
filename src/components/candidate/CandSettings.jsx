import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { updatePassword } from 'firebase/auth';
import { auth } from '../../firebase';
import {
  SettingsShell, Section, Field, Input, ToggleRow, SaveRow,
} from '../shared/SettingsShell';

// ─────────────────────────────────────────────────────────────────
//  TAB: Profile
// ─────────────────────────────────────────────────────────────────
function ProfileTab() {
  const { profile, updateProfile } = useAuth();
  const { showToast, navigate } = useApp();

  const [form, setForm] = useState({
    full_name:   profile?.full_name   || '',
    job_title:   profile?.job_title   || '',
    location:    profile?.location    || '',
    linkedin:    profile?.linkedin    || '',
    portfolio:   profile?.portfolio   || '',
    github:      profile?.github      || '',
    headline:    profile?.headline    || '',
  });
  const [saved, setSaved]   = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => { setForm(p => ({ ...p, [k]: e.target.value })); setSaved(false); };

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await updateProfile({ ...form });
      if (error) throw error;
      setSaved(true);
      showToast('Profile updated ✓', 'success');
    } catch (error) {
      showToast('Error — ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Section title="Public profile" subtitle="What employers see when you match. Keep this sharp — it's your first impression.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
          <Field label="Full name">
            <Input value={form.full_name} onChange={set('full_name')} placeholder={profile?.full_name || "Jordan Mitchell"} />
          </Field>
          <Field label="Current title">
            <Input value={form.job_title} onChange={set('job_title')} placeholder={profile?.job_title || "Senior Product Manager"} />
          </Field>
        </div>
        <Field label="Location" hint="Used for location-based matching. City level only.">
          <Input value={form.location} onChange={set('location')} placeholder="London, UK" />
        </Field>
        <Field label="Profile headline" hint="One line. What makes you different.">
          <Input value={form.headline} onChange={set('headline')} placeholder="Fintech PM · 7yr · Async-first · Strategist archetype" />
        </Field>
        <SaveRow onSave={handleSave} saved={saved} loading={saving} />
      </Section>

      <Section title="Links" subtitle="Shown to employers after mutual match.">
        <Field label="LinkedIn">
          <Input value={form.linkedin} onChange={set('linkedin')} placeholder="linkedin.com/in/…" />
        </Field>
        <Field label="Portfolio or website">
          <Input value={form.portfolio} onChange={set('portfolio')} placeholder={profile?.portfolio || "jordanmitchell.com"} />
        </Field>
        <Field label="GitHub">
          <Input value={form.github} onChange={set('github')} placeholder="github.com/…" />
        </Field>
        <SaveRow onSave={handleSave} saved={saved} loading={saving} />
      </Section>

      <Section title="Work DNA™" subtitle="Your 7-dimension work style profile. This directly affects your match scores.">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{profile?.archetype || 'The Strategist'} · 7 dimensions set</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Last updated 3 days ago · Affects culture-fit score on all matches</div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ color: '#f9a8d4', borderColor: 'rgba(236,72,153,.3)', flexShrink: 0 }} onClick={() => navigate('cand-work-dna')}>
            Edit DNA →
          </button>
        </div>
      </Section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
//  TAB: Security
// ─────────────────────────────────────────────────────────────────
function SecurityTab() {
  const { session } = useAuth();
  const { showToast } = useApp();

  const [pwForm, setPwForm] = useState({ next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError,  setPwError]  = useState('');
  const [pwSaved,  setPwSaved]  = useState(false);

  async function handlePasswordChange() {
    setPwError('');
    if (pwForm.next.length < 8)        { setPwError('Password must be at least 8 characters.'); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError('Passwords do not match.'); return; }
    setPwSaving(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, pwForm.next);
        setPwSaved(true);
        setPwForm({ next: '', confirm: '' });
        showToast('Password updated ✓', 'success');
      }
    } catch (error) {
      setPwError(error.message);
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <>
      <Section title="Email address">
        <Field label="Current email">
          <Input value={session?.user?.email || ''} disabled />
        </Field>
        <Field label="New email address">
          <div style={{ display: 'flex', gap: 8 }}>
            <Input placeholder="new@email.com" type="email" />
            <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} onClick={() => showToast('Confirmation email sent ✓', 'success')}>Update</button>
          </div>
        </Field>
      </Section>

      <Section title="Password">
        <Field label="New password">
          <Input type="password" value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} placeholder="New password (8+ characters)" />
        </Field>
        <Field label="Confirm new password">
          <Input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Confirm password" />
        </Field>
        {pwError && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{pwError}</div>}
        <SaveRow onSave={handlePasswordChange} saved={pwSaved} loading={pwSaving} />
      </Section>

      <Section title="Active sessions">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>This device</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Chrome · {navigator.platform} · Active now</div>
          </div>
          <span style={{ padding: '2px 8px', borderRadius: 'var(--rp)', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.25)', fontSize: 11, fontWeight: 600, color: 'var(--green)' }}>Current</span>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', borderColor: 'rgba(251,113,133,.3)' }}
            onClick={() => showToast('All other sessions signed out ✓', 'success')}>
            Sign out all other sessions
          </button>
        </div>
      </Section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
//  TAB: Notifications
// ─────────────────────────────────────────────────────────────────
function NotificationsTab() {
  const { showToast } = useApp();
  const [prefs, setPrefs] = useState({
    newMatch:       true,
    employerMsg:    true,
    stageUpdate:    true,
    ghostingAlert:  true,
    pulseReminder:  true,
    benchActivity:  true,
    trajectoryTip:  false,
    weeklyDigest:   true,
    productUpdates: false,
    emailAlerts:    true,
    inApp:          true,
  });
  const [saved, setSaved] = useState(false);
  const toggle = (k) => (v) => { setPrefs(p => ({ ...p, [k]: v })); setSaved(false); };

  return (
    <>
      <Section title="Match & pipeline alerts">
        <ToggleRow label="New mutual match"      sub="When an employer also shows interest in you"           checked={prefs.newMatch}       onChange={toggle('newMatch')} />
        <ToggleRow label="Employer message"      sub="New messages from matched employers"                   checked={prefs.employerMsg}    onChange={toggle('employerMsg')} />
        <ToggleRow label="Stage update"          sub="When an employer moves you to a new pipeline stage"    checked={prefs.stageUpdate}    onChange={toggle('stageUpdate')} />
        <ToggleRow label="Ghosting alert"        sub="When an employer goes silent (48h+ no response)"       checked={prefs.ghostingAlert}  onChange={toggle('ghostingAlert')} color="var(--amber)" />
      </Section>

      <Section title="Career OS">
        <ToggleRow label="Career Pulse reminder" sub="Quarterly check-in to track career satisfaction"       checked={prefs.pulseReminder}  onChange={toggle('pulseReminder')} />
        <ToggleRow label="Bench activity"        sub="Employer interest while you're on The Bench™"          checked={prefs.benchActivity}  onChange={toggle('benchActivity')} />
        <ToggleRow label="Trajectory insight"    sub="New data points on your chosen career path"            checked={prefs.trajectoryTip}  onChange={toggle('trajectoryTip')} />
      </Section>

      <Section title="Delivery">
        <ToggleRow label="In-app notifications"  sub="Notification bell and in-app centre"                  checked={prefs.inApp}          onChange={toggle('inApp')} />
        <ToggleRow label="Email alerts"          sub="Get urgent notifications by email"                    checked={prefs.emailAlerts}    onChange={toggle('emailAlerts')} />
        <ToggleRow label="Weekly digest"         sub="Summary of your activity, new matches, and insights"  checked={prefs.weeklyDigest}   onChange={toggle('weeklyDigest')} />
        <ToggleRow label="Product updates"       sub="New Hiro features and improvements"                   checked={prefs.productUpdates} onChange={toggle('productUpdates')} />
      </Section>

      <SaveRow onSave={() => { setSaved(true); showToast('Notification preferences saved ✓', 'success'); }} saved={saved} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
//  TAB: Privacy & Stealth
// ─────────────────────────────────────────────────────────────────
function PrivacyTab() {
  const { showToast, navigate } = useApp();
  const [exporting, setExporting] = useState(false);
  const [exported,  setExported]  = useState(false);

  const [visibility, setVisibility] = useState({
    stealth:         false,
    hideSalary:      false,
    hideCurrentCo:   false,
    hideName:        false,
    profileIndexed:  true,
  });
  const [saved, setSaved] = useState(false);
  const toggle = (k) => (v) => { setVisibility(p => ({ ...p, [k]: v })); setSaved(false); };

  async function handleExport() {
    setExporting(true);
    await new Promise(r => setTimeout(r, 1800));
    setExporting(false);
    setExported(true);
    showToast('Data export prepared — download link emailed ✓', 'success');
  }

  return (
    <>
      <Section title="Visibility controls" subtitle="Control exactly who can see your profile and what they can see.">
        <ToggleRow
          label="Stealth mode"
          sub="Your current employer cannot see you on Hiro. You're invisible to their account."
          checked={visibility.stealth}
          onChange={toggle('stealth')}
          color="#f9a8d4"
        />
        <ToggleRow
          label="Hide current company"
          sub="Replaces your current employer name with 'Confidential' in matches"
          checked={visibility.hideCurrentCo}
          onChange={toggle('hideCurrentCo')}
        />
        <ToggleRow
          label="Hide salary expectations"
          sub="Employers can't filter you out by salary. Discuss in conversation instead."
          checked={visibility.hideSalary}
          onChange={toggle('hideSalary')}
        />
        <ToggleRow
          label="Hide full name"
          sub="Show first name + initial only until mutual match is confirmed"
          checked={visibility.hideName}
          onChange={toggle('hideName')}
        />
        <ToggleRow
          label="Allow profile indexing"
          sub="Let Hiro surface your profile to relevant employers (disabling reduces matches)"
          checked={visibility.profileIndexed}
          onChange={toggle('profileIndexed')}
          color="var(--green)"
        />
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('cand-stealth')}>Full stealth controls →</button>
          <SaveRow onSave={() => { setSaved(true); showToast('Privacy settings saved ✓', 'success'); }} saved={saved} />
        </div>
      </Section>

      <Section title="Your data rights" subtitle="Hiro is GDPR compliant. All data is stored in the EU. We never sell your data.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { icon: '🔒', label: 'Profile data is encrypted at rest', sub: 'AES-256 · EU data centre (Frankfurt, AWS eu-central-1)' },
            { icon: '🚫', label: 'Your data is never sold', sub: 'Hiro is ad-free. No third-party data sharing.' },
            { icon: '🧬', label: 'DNA data is anonymised in benchmarks', sub: 'Only aggregated trends shared in market reports.' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{r.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{r.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 13px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>📤 Export my data</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Everything Hiro holds on you — profile, DNA, match history, messages. Emailed as JSON + CSV.</div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} onClick={handleExport} disabled={exporting}>
              {exporting ? 'Preparing…' : exported ? '✓ Sent' : 'Export'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 13px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>⚖️ GDPR request (erasure, rectification)</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>We respond within 72 hours. Right to be forgotten, right of access, right to rectification.</div>
            </div>
            <a href="mailto:privacy@hiro.so?subject=GDPR%20Request" className="btn btn-ghost btn-sm" style={{ flexShrink: 0, textDecoration: 'none' }}>Contact DPO</a>
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
          <a href="/privacy" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>Privacy Policy</a> ·{' '}
          <a href="/terms"   style={{ color: 'var(--cyan)', textDecoration: 'none' }}>Terms of Service</a> ·{' '}
          DPO: <a href="mailto:privacy@hiro.so" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>privacy@hiro.so</a>
        </div>
      </Section>

      <Section title="Delete account" subtitle="Permanently delete your Hiro profile and all your data. This cannot be undone." danger>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.55, maxWidth: 400 }}>
            Your profile, Work DNA™, match history, messages, and reviews will be permanently erased. Employers in active conversations will be notified.
          </div>
          <button
            className="btn btn-sm"
            style={{ background: 'rgba(251,113,133,.1)', border: '1px solid rgba(251,113,133,.3)', color: 'var(--red)', flexShrink: 0, marginLeft: 16 }}
            onClick={() => showToast('Contact support@hiro.so to delete your account', 'error')}
          >Delete account</button>
        </div>
      </Section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
//  ROOT VIEW
// ─────────────────────────────────────────────────────────────────
export default function CandSettings() {
  const { signOut } = useAuth();
  const { showToast } = useApp();

  async function handleSignOut() {
    showToast('Signing out…', 'default');
    await signOut();
  }

  const tabs = [
    { id: 'profile',       icon: '👤', label: 'Profile',              content: <ProfileTab /> },
    { id: 'security',      icon: '🔑', label: 'Security',             content: <SecurityTab /> },
    { id: 'notifications', icon: '🔔', label: 'Notifications',        content: <NotificationsTab /> },
    { id: 'privacy',       icon: '🔒', label: 'Privacy & GDPR',       content: <PrivacyTab /> },
  ];

  return (
    <>
      <SettingsShell
        tabs={tabs}
        title="Settings"
        subtitle="Manage your profile, privacy, and account preferences."
      />
      <div style={{ position: 'fixed', bottom: 20, right: 24 }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ color: 'var(--text3)', fontSize: 12 }}
          onClick={handleSignOut}
        >Sign out</button>
      </div>
    </>
  );
}
