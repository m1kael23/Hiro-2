import { useApp } from '../../context/AppContext';

export default function TermsOfService() {
  const { navigate } = useApp();
  return (
    <div className="view-panel">
      <div className="scroll">
        <div className="page-hdr">
          <div>
            <div className="page-title">Terms of Service</div>
            <div className="page-sub">Last updated March 13, 2026 · Governed by Portuguese law</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('legal-privacy')}>Privacy Policy →</button>
        </div>

        <div className="legal-content">

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>By creating an account, accessing, or using the Hiro platform (&quot;Platform&quot;, &quot;Service&quot;) operated by Hiro Talent Lda, a company incorporated under Portuguese law (&quot;Hiro&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;), you (&quot;User&quot;) agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree with any part of these Terms, you must not use the Platform.</p>
            <p>These Terms apply to all users of the Platform, including candidates (job seekers) and employers (companies posting roles). Users must be at least 18 years of age.</p>
          </section>

          <section>
            <h2>2. Description of Service</h2>
            <p>Hiro is a talent matching platform that uses proprietary Work DNA™ psychometric profiling and algorithmic matching to connect candidates with employers. The Platform includes, but is not limited to:</p>
            <ul>
              <li>Candidate profile creation, Work DNA™ assessment, and career tools (Trajectory, Vault, Offer Intel)</li>
              <li>Employer job posting, pipeline management, and team DNA mapping</li>
              <li>AI-assisted CV parsing via third-party API (Google Gemini)</li>
              <li>The Bench™ passive talent pool</li>
              <li>Ghosting Score™ employer accountability system</li>
              <li>Real-time messaging between matched candidates and employers</li>
            </ul>
            <p>We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time with reasonable notice.</p>
          </section>

          <section>
            <h2>3. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You must:</p>
            <ul>
              <li>Provide accurate, current, and complete information when creating an account</li>
              <li>Immediately notify us at legal@hiro.talent of any unauthorised use of your account</li>
              <li>Not share your account credentials with third parties</li>
              <li>Not create accounts on behalf of others without authorisation</li>
            </ul>
            <p>Hiro reserves the right to terminate or suspend accounts that violate these Terms.</p>
          </section>

          <section>
            <h2>4. Candidate Responsibilities</h2>
            <p>As a candidate using the Platform, you agree to:</p>
            <ul>
              <li>Provide accurate and truthful information in your profile, CV, and Work DNA™ assessment</li>
              <li>Only express interest in roles you are genuinely considering</li>
              <li>Respond to employer communications within 48 hours where possible</li>
              <li>Not use the Platform to harvest employer contact data for unsolicited outreach</li>
              <li>Not misrepresent your qualifications, experience, or identity</li>
              <li>Notify the Platform if you accept an offer outside of Hiro to maintain the integrity of match data</li>
            </ul>
            <p>Repeated unresponsiveness to employer communications may negatively affect your Reliability Score, which is visible to employers on the Platform.</p>
          </section>

          <section>
            <h2>5. Employer Responsibilities</h2>
            <p>As an employer using the Platform, you agree to:</p>
            <ul>
              <li>Respond to candidate applications within 72 hours of a mutual match or expression of interest</li>
              <li>Provide accurate and lawful job descriptions, including genuine salary ranges</li>
              <li>Not discriminate against candidates on the basis of race, gender, age, religion, disability, sexual orientation, or any other protected characteristic under applicable law</li>
              <li>Not use candidate data obtained through Hiro for purposes other than the recruitment process</li>
              <li>Maintain respectful and professional communications with all candidates</li>
              <li>Notify Hiro within 5 business days of making a hire through the Platform</li>
            </ul>
            <p>Employers who consistently fail to respond to candidates within the 72-hour window will have their Ghosting Score™ adjusted accordingly. Ghosting Scores are visible to candidates and may affect an employer&apos;s ability to attract talent through the Platform.</p>
          </section>

          <section>
            <h2>6. Fees and Payment</h2>
            <p>Access to certain features of the Platform is subject to a paid subscription. Hiro currently offers the following plans for employers:</p>
            <ul>
              <li><strong>Free Plan:</strong> Limited job postings and candidate visibility. No payment required.</li>
              <li><strong>Growth Plan (€499/month):</strong> Unlimited job postings, full candidate profiles, The Bench™ access, Offer Intel, and DNA matching. Billed monthly or annually.</li>
              <li><strong>Scale Plan (€1,499/month):</strong> All Growth features plus Team DNA analytics, API integrations, dedicated account support, and custom DNA frameworks. Billed monthly or annually.</li>
            </ul>
            <p>All prices are exclusive of VAT. VAT will be charged at the applicable Portuguese rate (currently 23%) or EU reverse-charge mechanism for B2B customers within the EU.</p>
            <p>Payments are processed via Stripe or Paddle (our authorised payment processors). By subscribing, you authorise us to charge your payment method on a recurring basis. Subscriptions auto-renew unless cancelled at least 24 hours before the renewal date.</p>
            <p>Refunds: Paid subscription fees are non-refundable except where required by applicable law. If you believe you have been charged in error, contact billing@hiro.talent within 14 days.</p>
            <p>We reserve the right to change pricing with 30 days&apos; notice to existing subscribers. Continued use of the Service after a price change constitutes acceptance of the new pricing.</p>
          </section>

          <section>
            <h2>7. Work DNA™ and Proprietary Algorithms</h2>
            <p>The Work DNA™ assessment, matching algorithms, archetype classification system, and Ghosting Score™ methodology are proprietary intellectual property of Hiro Talent Lda. You acknowledge that:</p>
            <ul>
              <li>Match scores are algorithmic outputs and do not constitute employment recommendations or guarantees of fit</li>
              <li>Work DNA™ data is used solely for matching purposes and is not shared with third parties beyond what is described in our Privacy Policy</li>
              <li>Hiro reserves the right to improve or modify the matching algorithm at any time</li>
              <li>You may not reverse-engineer, copy, or replicate the matching methodology</li>
            </ul>
          </section>

          <section>
            <h2>8. Intellectual Property</h2>
            <p>All content, software, designs, trademarks, and intellectual property on the Platform — including Work DNA™, The Bench™, Ghosting Score™, Process Vault™, and the Hiro Score™ — are owned by or licensed to Hiro Talent Lda. You are granted a limited, non-exclusive, non-transferable licence to use the Platform for its intended purpose.</p>
            <p>You retain ownership of the content you submit to the Platform (your profile, CV, and Work DNA™ data). By submitting content, you grant Hiro a worldwide, royalty-free licence to use, display, and process that content solely for operating the Service.</p>
            <p>You may not copy, distribute, sell, or create derivative works from any part of the Platform without prior written consent from Hiro.</p>
          </section>

          <section>
            <h2>9. Data Protection and GDPR</h2>
            <p>Hiro processes personal data in accordance with Regulation (EU) 2016/679 (General Data Protection Regulation), the Portuguese Data Protection Law (Lei n.º 58/2019), and our Privacy Policy.</p>
            <p>As a data subject, you have the right to:</p>
            <ul>
              <li>Access, correct, or delete your personal data at any time via Account Settings</li>
              <li>Withdraw consent for Work DNA™ processing (note: this will disable matching functionality)</li>
              <li>Request data portability (export your data in JSON format)</li>
              <li>Lodge a complaint with the CNPD (Comissão Nacional de Proteção de Dados), the Portuguese supervisory authority</li>
            </ul>
            <p>Work DNA™ psychometric data is classified as sensitive under our internal data classification policy. It is pseudonymised before any analytical processing and is never sold to third parties.</p>
          </section>

          <section>
            <h2>10. Prohibited Conduct</h2>
            <p>You must not use the Platform to:</p>
            <ul>
              <li>Post fraudulent, misleading, or discriminatory job listings</li>
              <li>Scrape, harvest, or mass-export candidate or employer data</li>
              <li>Use automated tools, bots, or scripts to interact with the Platform</li>
              <li>Circumvent any technical measures designed to protect the Platform</li>
              <li>Upload malware, viruses, or any harmful code</li>
              <li>Engage in harassment, abuse, or threatening behaviour toward other users</li>
              <li>Impersonate any person or organisation</li>
              <li>Violate any applicable law or regulation</li>
            </ul>
            <p>Violations may result in immediate account suspension without refund and, where applicable, referral to law enforcement authorities.</p>
          </section>

          <section>
            <h2>11. Disclaimers</h2>
            <p>The Platform is provided on an &quot;as is&quot; and &quot;as available&quot; basis. Hiro makes no warranties, express or implied, including but not limited to:</p>
            <ul>
              <li>That the Platform will be uninterrupted, error-free, or free from security vulnerabilities</li>
              <li>That match scores will result in successful hires or employment outcomes</li>
              <li>The accuracy of salary benchmarking data in Offer Intel</li>
              <li>That AI-generated content (Gemini CV analysis, trajectory summaries) is accurate or complete</li>
            </ul>
            <p>Hiro is a marketplace platform and is not a recruitment agency. We do not guarantee job placement, employment, or hiring outcomes.</p>
          </section>

          <section>
            <h2>12. Limitation of Liability</h2>
            <p>To the maximum extent permitted by Portuguese and EU law, Hiro&apos;s total aggregate liability to you for any claims arising out of or related to these Terms or the Service — whether in contract, tort, or otherwise — shall not exceed the greater of:</p>
            <ul>
              <li>The total fees paid by you to Hiro in the 12 months preceding the claim; or</li>
              <li>€500 (five hundred euros)</li>
            </ul>
            <p>In no event shall Hiro be liable for indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, loss of data, or loss of business opportunity, even if Hiro has been advised of the possibility of such damages.</p>
            <p>Nothing in these Terms limits our liability for death or personal injury caused by negligence, fraud, or fraudulent misrepresentation, or any other liability that cannot be excluded under applicable law.</p>
          </section>

          <section>
            <h2>13. Termination</h2>
            <p><strong>By you:</strong> You may terminate your account at any time via Account Settings → Delete Account. Upon termination, your profile and personal data will be deleted within 30 days in accordance with our Privacy Policy, except where retention is required by law.</p>
            <p><strong>By Hiro:</strong> We may suspend or terminate your account immediately and without notice if:</p>
            <ul>
              <li>You materially breach these Terms</li>
              <li>We are required to do so by law</li>
              <li>Continued access poses a security or legal risk to the Platform or other users</li>
            </ul>
            <p>Upon termination by Hiro for breach, no refund of prepaid subscription fees will be issued. Upon termination by Hiro for reasons other than breach, we will refund a pro-rated portion of any prepaid fees covering the unused period.</p>
            <p>Provisions of these Terms that by their nature should survive termination shall do so, including Sections 7 (IP), 9 (Data Protection), 12 (Limitation of Liability), and 14 (Governing Law).</p>
          </section>

          <section>
            <h2>14. Changes to Terms</h2>
            <p>We may update these Terms from time to time. If we make material changes, we will notify you by email and via an in-app notification at least 30 days before the changes take effect. Your continued use of the Platform after the effective date constitutes acceptance of the revised Terms.</p>
            <p>If you do not agree to the revised Terms, you must discontinue use of the Platform and may request account deletion.</p>
          </section>

          <section>
            <h2>15. Governing Law and Dispute Resolution</h2>
            <p>These Terms are governed by and construed in accordance with the laws of Portugal, without regard to its conflict of law provisions.</p>
            <p>Any dispute, controversy, or claim arising out of or relating to these Terms or the Platform shall be subject to the exclusive jurisdiction of the courts of Lisbon, Portugal (&quot;Tribunais de Lisboa&quot;), except where mandatory consumer protection law in your country of residence grants you the right to bring proceedings in your local courts.</p>
            <p>Before initiating formal proceedings, the parties agree to attempt good-faith resolution via written notice to legal@hiro.talent. If unresolved within 30 days, either party may pursue formal dispute resolution.</p>
            <p>EU consumers may also use the European Commission&apos;s Online Dispute Resolution platform at ec.europa.eu/consumers/odr.</p>
          </section>

          <section>
            <h2>16. Contact</h2>
            <p>For questions about these Terms, contact:</p>
            <ul>
              <li><strong>Email:</strong> legal@hiro.talent</li>
              <li><strong>Data Protection Officer:</strong> dpo@hiro.talent</li>
              <li><strong>Registered address:</strong> Hiro Talent Lda, Lisboa, Portugal</li>
            </ul>
          </section>

        </div>
      </div>
    </div>
  );
}
