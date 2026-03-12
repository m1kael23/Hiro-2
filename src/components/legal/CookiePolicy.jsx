export default function CookiePolicy() {
  return (
    <div className="view-panel">
      {/* ... */}
      <section>
        <h2>Cookie Usage</h2>
        <table>
          <thead>
            <tr><th>Name</th><th>Purpose</th><th>Duration</th></tr>
          </thead>
          <tbody>
            <tr><td>sb-session</td><td>Authentication</td><td>Session</td></tr>
            <tr><td>_hiro_analytics</td><td>Usage analytics</td><td>30 days</td></tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
