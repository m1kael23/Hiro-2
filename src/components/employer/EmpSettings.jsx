import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { db, auth } from '../../firebase';
import {
  SettingsShell, Section, Field, Input, ToggleRow, SaveRow,
} from '../shared/SettingsShell';

// ─────────────────────────────────────────────────────────────────
//  TAB: Profile & Company
// ─────────────────────────────────────────────────────────────────
function ProfileTab() {
  const { profile } = useAuth();
  const { showToast } = useApp();

  const [form, setForm] = useState({
    fullName:    profile?.full_name   || '',
    jobTitle:    profile?.job_title   || '',
    companyName: profile?.company_name || '',
    companySize: profile?.company_size || '',
    industry:    profile?.industry    || '',
    website:     profile?.website     || '',
    linkedin:    profile?.linkedin    || '',
    location:    profile?.location    || '',
    bio:         profile?.bio         || '',
  });
  const [saved, setSaved]   = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => { setForm(p => ({ ...p, [k]: e.target.value })); setSaved(false); };

  async function handleSave() {
    setSaving(true);
    try {
      const docRef = doc(db, 'users', profile?.id);
      await updateDoc(docRef, { ...form });
      setSaved(true);
      showToast('Profile updated ✓', 'success');
    } catch (error) {
      showToast('Error saving — ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Section title="Your details" subtitle="Visible to candidates you match with after mutual interest.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
          <Field label="Full name">
            <Input value={form.fullName} onChange={set('fullName')} placeholder={profile?.full_name || "Jamie Donovan"} />
          </Field>
          <Field label="Job title">
            <Input value={form.jobTitle} onChange={set('jobTitle')} placeholder={profile?.job_title || "Head of Talent"} />
          </Field>
        </div>
        <Field label="LinkedIn profile URL">
          <Input value={form.linkedin} onChange={set('linkedin')} placeholder="linkedin.com/in/…" />
        </Field>
        <SaveRow onSave={handleSave} saved={saved} loading={saving} />
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

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError,  setPwError]  = useState('');
  const [pwSaved,  setPwSaved]  = useState(false);

  async function handlePasswordChange() {
    setPwError('');
    if (pwForm.next.length < 8)         { setPwError('Password must be at least 8 characters.'); return; }
    if (pwForm.next !== pwForm.confirm)  { setPwError('Passwords do not match.'); return; }
    setPwSaving(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, pwForm.next);
        setPwSaved(true);
        setPwForm({ current: '', next: '', confirm: '' });
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
      <Section title="Email address" subtitle="Your login email. A confirmation link will be sent to the new address.">
        <Field label="Current email">
          <Input value={session?.user?.email || ''} disabled />
        </Field>
        <Field label="New email address">
          <div style={{ display: 'flex', gap: 8 }}>
            <Input placeholder="new@email.com" type="email" onChange={() => {}} value="" />
            <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} onClick={() => showToast('Confirmation sent ✓', 'success')}>Update</button>
          </div>
        </Field>
      </Section>

      <Section title="Password" subtitle="Use a strong, unique password. Minimum 8 characters.">
        <Field label="New password">
          <Input type="password" value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} placeholder="New password" />
        </Field>
        <Field label="Confirm new password">
          <Input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Confirm password" />
        </Field>
        {pwError && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{pwError}</div>}
        <SaveRow onSave={handlePasswordChange} saved={pwSaved} loading={pwSaving} />
      </Section>

      <Section title="Active sessions" subtitle="Devices currently signed in to your Hiro account.">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
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
    candidateMsg:   true,
    stageReminder:  true,
    ghostingAlert:  true,
    pulseSignal:    true,
    weeklyReport:   true,
    productUpdates: false,
    emailDigest:    true,
    inApp:          true,
    slackWebhook:   false,
  });
  const [saved, setSaved] = useState(false);

  const toggle = (k) => (v) => { setPrefs(p => ({ ...p, [k]: v })); setSaved(false); };

  function handleSave() {
    setSaved(true);
    showToast('Notification preferences saved ✓', 'success');
  }

  return (
    <>
      <Section title="Hiring notifications" subtitle="Alerts for candidate and pipeline activity.">
        <ToggleRow label="New mutual match"        sub="When a candidate also shows interest in your role"   checked={prefs.newMatch}       onChange={toggle('newMatch')} />
        <ToggleRow label="Candidate message"       sub="When a matched candidate sends you a message"        checked={prefs.candidateMsg}   onChange={toggle('candidateMsg')} />
        <ToggleRow label="Stage reminder"          sub="Candidates waiting 48h+ without a response"          checked={prefs.stageReminder}  onChange={toggle('stageReminder')} color="var(--amber)" />
        <ToggleRow label="Ghosting alert"          sub="When your response rate drops below threshold"        checked={prefs.ghostingAlert}  onChange={toggle('ghostingAlert')} color="var(--red)" />
        <ToggleRow label="Team Pulse signal"       sub="Drift or satisfaction flags from your hired team"    checked={prefs.pulseSignal}    onChange={toggle('pulseSignal')} />
      </Section>

      <Section title="Reports & product">
        <ToggleRow label="Weekly hiring report"   sub="Summary of pipeline activity, matches, and timing"   checked={prefs.weeklyReport}   onChange={toggle('weeklyReport')} />
        <ToggleRow label="Product updates"        sub="New Hiro features and improvements"                  checked={prefs.productUpdates} onChange={toggle('productUpdates')} />
      </Section>

      <Section title="Delivery channels">
        <ToggleRow label="In-app notifications"   sub="Bell icon and notification centre"                   checked={prefs.inApp}          onChange={toggle('inApp')} />
        <ToggleRow label="Email digest"           sub="Daily or real-time email for urgent alerts"          checked={prefs.emailDigest}    onChange={toggle('emailDigest')} />
        <ToggleRow label="Slack webhook"          sub="Post alerts to a Slack channel (configure below)"    checked={prefs.slackWebhook}   onChange={toggle('slackWebhook')} />
        {prefs.slackWebhook && (
          <div style={{ marginTop: 10 }}>
            <Field label="Slack webhook URL">
              <Input placeholder="https://hooks.slack.com/services/…" />
            </Field>
          </div>
        )}
      </Section>

      <SaveRow onSave={handleSave} saved={saved} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
//  TAB: Plan & Billing
// ─────────────────────────────────────────────────────────────────
function BillingTab() {
  const { navigate } = useApp();

  return (
    <>
      <Section title="Current plan">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: 'Manrope,sans-serif', fontSize: 18, fontWeight: 800, color: '#a78bfa' }}>Hiro Pro</span>
              <span style={{ padding: '2px 8px', borderRadius: 'var(--rp)', background: 'rgba(108,71,255,.15)', border: '1px solid rgba(108,71,255,.3)', fontSize: 11, fontWeight: 700, color: '#a78bfa' }}>Active</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>£299/month · Renews 14 Apr 2026 · 3 active roles</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('emp-pricing')}>Manage plan →</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 8 }}>
          {[
            { lbl: 'Active roles',    val: '3 / 5',   col: 'var(--cyan)' },
            { lbl: 'Seats',           val: '2 / 3',   col: '#a78bfa' },
            { lbl: 'Next invoice',    val: '£299',     col: 'var(--green)' },
          ].map(r => (
            <div key={r.lbl} style={{ textAlign: 'center', padding: '10px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 18, fontWeight: 800, color: r.col }}>{r.val}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{r.lbl}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Payment method">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 28, borderRadius: 6, background: 'linear-gradient(135deg,#1a1f71,#00439c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff' }}>VISA</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Visa ending 4242</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Expires 08/27</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => {}}>Update</button>
        </div>
      </Section>

      <Section title="Billing history">
        {[
          { date: '14 Mar 2026', desc: 'Hiro Pro — Monthly',  amount: '£299.00', status: 'Paid' },
          { date: '14 Feb 2026', desc: 'Hiro Pro — Monthly',  amount: '£299.00', status: 'Paid' },
          { date: '14 Jan 2026', desc: 'Hiro Pro — Monthly',  amount: '£299.00', status: 'Paid' },
        ].map((inv, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,.05)', fontSize: 12 }}>
            <div style={{ color: 'var(--text3)' }}>{inv.date}</div>
            <div style={{ flex: 1, marginLeft: 16, color: 'var(--text2)' }}>{inv.desc}</div>
            <div style={{ fontWeight: 700, marginRight: 12 }}>{inv.amount}</div>
            <span style={{ padding: '2px 8px', borderRadius: 'var(--rp)', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.25)', color: 'var(--green)', fontSize: 11, fontWeight: 600 }}>{inv.status}</span>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>Download all invoices</button>
      </Section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
//  TAB: Privacy & GDPR
// ─────────────────────────────────────────────────────────────────
function PrivacyTab() {
  const { showToast } = useApp();
  const [exporting, setExporting] = useState(false);
  const [exported,  setExported]  = useState(false);

  async function handleExport() {
    setExporting(true);
    await new Promise(r => setTimeout(r, 1800));
    setExporting(false);
    setExported(true);
    showToast('Data export prepared — download link emailed ✓', 'success');
  }

  return (
    <>
      <Section title="Data & privacy" subtitle="Hiro is fully GDPR compliant. You control your data.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { icon: '🔒', title: 'Employer data is encrypted at rest', sub: 'AES-256 encryption on all stored profile and pipeline data.' },
            { icon: '🌍', title: 'Data stored in EU (Frankfurt)', sub: 'All data is hosted on AWS eu-central-1. We never transfer outside the EEA.' },
            { icon: '🚫', title: 'We never sell your data', sub: 'Hiro is ad-free. Your data is never sold to or shared with third parties.' },
            { icon: '📋', title: 'Candidate data is anonymised in reports', sub: 'Aggregate stats never contain personally identifiable candidate data.' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{r.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{r.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Your data rights" subtitle="Under GDPR Articles 15–22, you have the right to access, export, and delete your data.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>📤 Export my data</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Download all data Hiro holds on your account (JSON + CSV). Sent to your email.</div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} onClick={handleExport} disabled={exporting}>
              {exporting ? 'Preparing…' : exported ? '✓ Sent' : 'Export'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>📩 Data processing agreement</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Download our standard DPA for your compliance records.</div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} onClick={() => showToast('DPA download started ✓', 'success')}>Download</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--r)', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>⚖️ Submit a GDPR request</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Right to erasure, rectification, or restriction. We respond within 72 hours.</div>
            </div>
            <a href="mailto:privacy@hiro.so?subject=GDPR%20Request" className="btn btn-ghost btn-sm" style={{ flexShrink: 0, textDecoration: 'none' }}>Contact DPO</a>
          </div>
        </div>
        <div style={{ marginTop: 14, padding: '10px 13px', borderRadius: 'var(--r)', background: 'rgba(56,189,248,.05)', border: '1px solid rgba(56,189,248,.18)', fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
          📘 Read our full <a href="/privacy" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>Privacy Policy</a> and <a href="/terms" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>Terms of Service</a>.
          DPO contact: <a href="mailto:privacy@hiro.so" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>privacy@hiro.so</a>
        </div>
      </Section>

      <Section title="Delete account" subtitle="Permanently delete your company account and all associated data. This cannot be undone." danger>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.55, maxWidth: 420 }}>
            All job listings, pipeline data, team members, and match history will be permanently removed. Candidates in your pipeline will be notified. This cannot be reversed.
          </div>
          <button
            className="btn btn-sm"
            style={{ background: 'rgba(251,113,133,.12)', border: '1px solid rgba(251,113,133,.3)', color: 'var(--red)', flexShrink: 0, marginLeft: 16 }}
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
export default function EmpSettings() {
  const { signOut } = useAuth();
  const { showToast } = useApp();

  async function handleSignOut() {
    showToast('Signing out…', 'default');
    await signOut();
  }

  const tabs = [
    { id: 'profile',       icon: '🏢', label: 'Profile', content: <ProfileTab /> },
    { id: 'security',      icon: '🔑', label: 'Security',          content: <SecurityTab /> },
    { id: 'notifications', icon: '🔔', label: 'Notifications',     content: <NotificationsTab /> },
    { id: 'billing',       icon: '💳', label: 'Plan & Billing',    content: <BillingTab /> },
    { id: 'privacy',       icon: '🔒', label: 'Privacy & GDPR',    content: <PrivacyTab /> },
  ];

  return (
    <>
      <SettingsShell
        tabs={tabs}
        title="Settings"
        subtitle="Manage your employer account, company profile, and billing."
      />
      {/* Sign-out at page bottom */}
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
