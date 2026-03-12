import { useApp } from '../../context/AppContext';

export default function PrivacyPolicy() {
  const { navigate } = useApp();
  return (
    <div className="view-panel">
      <div className="scroll">
        <div className="page-hdr">
          <div>
            <div className="page-title">Privacy Policy</div>
            <div className="page-sub">Last updated March 10, 2026</div>
          </div>
        </div>
        
        <div className="legal-content">
          <section>
            <h2>1. Introduction</h2>
            <p>Hiro (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the neo-revolut style talent platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our web app at hiro.talent, use our services, or interact with us.</p>
          </section>

          <section>
            <h2>2. Information We Collect</h2>
            <h3>Personal Data You Provide</h3>
            <ul>
              <li>Account data: email, name, profile details</li>
              <li>Work DNA™: psychometric preferences (energy, decisions, rhythm, speed)</li>
              <li>Career data: experience, skills, applications, reviews</li>
              <li>Communications: messages, support tickets</li>
            </ul>
          </section>

          <section>
            <h2>3. How We Use Your Data</h2>
            <ul>
              <li>Matching candidates to employer roles using Work DNA™</li>
              <li>Authenticating your identity (Supabase)</li>
              <li>Sending transactional emails (job matches, application updates)</li>
              <li>Improving our matching algorithms</li>
              <li>GDPR compliance: right to access/delete your data</li>
            </ul>
          </section>

          <section>
            <h2>4. Data Sharing</h2>
            <p>We <strong>never sell your data</strong>. We share limited profile data only with employers you&apos;ve mutually matched with.</p>
          </section>

          <section>
            <h2>5. GDPR Rights (EU Residents)</h2>
            <p>As a Portuguese company, we fully comply with GDPR:</p>
            <ul>
              <li>Right to access, rectify, erase (&quot;right to be forgotten&quot;)</li>
              <li>Data portability</li>
              <li>Withdraw consent</li>
              <li>Contact: privacy@hiro.talent</li>
            </ul>
          </section>

          <section>
            <h2>6. Cookies & Tracking</h2>
            <p>See our <a href="#" onClick={(e) => { e.preventDefault(); navigate('legal-cookies'); }}>Cookie Policy</a>.</p>
          </section>

          <section>
            <h2>7. Changes to This Policy</h2>
            <p>We will notify you of material changes via email or in-app notification.</p>
          </section>

          <section>
            <h2>8. Contact Us</h2>
            <p>Hiro Talent OS<br/>
               Montijo, Setúbal, Portugal<br/>
               Email: privacy@hiro.talent<br/>
               DPO: data-protection@hiro.talent</p>
          </section>
        </div>
      </div>
    </div>
  );
}
