// Similar structure to PrivacyPolicy, but with ToS content:
export default function TermsOfService() {
  return (
    <div className="view-panel">
      {/* ... */}
      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>By creating an account or using Hiro, you agree to these Terms.</p>
      </section>
      <section>
        <h2>2. Candidate Responsibilities</h2>
        <ul>
          <li>Provide accurate profile information</li>
          <li>Only apply to roles you&apos;re genuinely interested in</li>
          <li>Respond to employer communications within 48 hours</li>
        </ul>
      </section>
      <section>
        <h2>3. Employer Responsibilities</h2>
        <ul>
          <li>Respond to candidate applications within 72 hours</li>
          <li>Job descriptions must be accurate</li>
          <li>No ghosting — maintain transparency</li>
        </ul>
      </section>
      {/* ... full ToS sections: Fees, Termination, Liability, Governing Law (Portuguese law) */}
    </div>
  );
}
