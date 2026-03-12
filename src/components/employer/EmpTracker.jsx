import { useApp } from "../../context/AppContext";

const HIRES = [
  {
    id: "anya",
    initials: "AP",
    name: "Anya Patel",
    role: "Engineer",
    hiredDate: "Mar 1",
    day: "Day 62",
    status: "healthy",
    statusLabel: "🟢 On track",
    dnaFit: "92%",
    dnaChipClass: "chip-g",
    headerRight: <span className="chip chip-g">All check-ins done ✓</span>,
    steps: [
      { dot: "done", label: "Offer accepted", date: "Mar 1" },
      { dot: "done", label: "Day 7 pulse", date: "Mar 8" },
      { dot: "done", label: "Day 30", date: "Apr 1" },
      { dot: "current", label: "Today", date: "Now", val: "62" },
      { dot: "future", label: "Day 90", date: "May 30", val: "90" },
      { dot: "future", label: "6 months", date: "Sep 1", val: "6M" },
    ],
    health: {
      score: 94,
      color: "var(--green)",
      desc: "Trending up — highly engaged, building relationships fast.",
      bars: [
        { w: 30, bg: "rgba(255,255,255,.1)" },
        { w: 55, bg: "rgba(255,255,255,.15)" },
        { w: 80, bg: "rgba(255,255,255,.2)" },
        { w: 94, bg: "var(--green)" },
      ],
    },
  },
  {
    id: "tom",
    initials: "TN",
    name: "Tom Nakamura",
    role: "Data Lead",
    hiredDate: "Apr 12",
    day: "Pre-start",
    status: "pending",
    statusLabel: null,
    dnaFit: "88%",
    dnaChipClass: "chip-p",
    steps: [
      { dot: "done", label: "Offer accepted", date: "Apr 12" },
      { dot: "current", label: "Day 7 pulse", date: "Due today", val: "7" },
      { dot: "future", label: "Day 30", date: "May 12", val: "30" },
      { dot: "future", label: "Day 90", date: "Jul 12", val: "90" },
      { dot: "future", label: "6 months", date: "Oct 12", val: "6M" },
    ],
    pulse: true,
  },
  {
    id: "james",
    initials: "JO",
    name: "James O'Brien",
    role: "PM",
    hiredDate: "Jan 15",
    day: "Day 105",
    status: "at-risk",
    statusLabel: "⚠ Needs attention",
    dnaFit: "74%",
    dnaChipClass: "chip-a",
    steps: [
      { dot: "done", label: "Hired", date: "Jan 15" },
      { dot: "done", label: "Day 7", date: "Jan 22" },
      { dot: "done", label: "Day 30", date: "Feb 14" },
      { dot: "overdue", label: "Day 90", date: "Overdue", val: "⚠" },
      { dot: "future", label: "6 months", date: "Jul 15", val: "6M" },
    ],
    health: {
      score: 61,
      color: "var(--amber)",
      desc: "Score dropped 78→61. Feedback: \"feeling disconnected from team direction.\"",
      bars: [
        { w: 80, bg: "rgba(255,255,255,.2)" },
        { w: 78, bg: "rgba(255,255,255,.2)" },
        { w: 70, bg: "rgba(245,158,11,.4)" },
        { w: 61, bg: "var(--red)" },
      ],
    },
    atRisk: true,
    avatarGrad: "linear-gradient(135deg,#f97316,#dc2626)",
  },
];

function DotEl({ step }) {
  const cls = `ht-dot ${step.dot}`;
  if (step.dot === "done") return <div className={cls}>✓</div>;
  if (step.dot === "overdue") return <div className={cls}>⚠</div>;
  return <div className={cls}>{step.val || ""}</div>;
}

export default function EmpTracker() {
  const { showToast } = useApp();

  const avatarGrad = (hire) => {
    if (hire.id === "anya") return "linear-gradient(135deg,#22c55e,#0d9488)";
    if (hire.id === "tom") return "var(--violet-grad)";
    return hire.avatarGrad;
  };

  return (
    <div className="view">
      <div className="scroll">
        <div className="page-hdr">
          <div>
            <div className="eyebrow">New feature</div>
            <div className="page-title">Hire tracker</div>
            <div className="page-sub">The relationship doesn&apos;t end at offer. Track onboarding health and re-engage if needed.</div>
          </div>
          <button className="btn btn-violet btn-sm" onClick={() => showToast("Report exported to CSV", "success")}>Export report</button>
        </div>

        <div className="tracker-shell">
          {/* Hero stats */}
          <div className="tracker-hero">
            <div className="tracker-hero-inner">
              <div style={{ display: "flex", gap: 24, alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap" }}>
                {[
                  { lbl: "Hired via Hiro", val: "3", sub: "This quarter", valColor: "#fff", lblColor: "rgba(56,189,248,.7)" },
                  { lbl: "Avg health", val: "87", sub: "Out of 100", valColor: "var(--green)", lblColor: "rgba(34,197,94,.7)" },
                  { lbl: "Check-ins due", val: "2", sub: "Action needed", valColor: "var(--amber)", lblColor: "rgba(245,158,11,.7)" },
                  { lbl: "12-mo retention", val: "100%", sub: "vs 71% industry", valColor: "#a78bfa", lblColor: "rgba(108,71,255,.7)" },
                ].map(s => (
                  <div key={s.lbl}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: s.lblColor, marginBottom: 4 }}>{s.lbl}</div>
                    <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 44, fontWeight: 800, color: s.valColor, lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>{s.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "var(--r)", padding: "10px 14px", fontSize: 12, color: "rgba(255,255,255,.55)" }}>
                ⚡ DNA fit 85%+ = <strong style={{ color: "rgba(255,255,255,.8)" }}>2.1× better 12-month retention</strong>. Your cohort avg DNA fit: <strong style={{ color: "#f9a8d4" }}>89%</strong>
              </div>
            </div>
          </div>

          {HIRES.map(hire => (
            <div key={hire.id} className={`checkin-card ${hire.status}`}>
              <div className="ci-header">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: avatarGrad(hire), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Manrope',sans-serif", fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{hire.initials}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{hire.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text2)" }}>
                      {hire.role} · {hire.id === "tom" ? `Offer sent ${hire.hiredDate} · ${hire.day}` : `Hired ${hire.hiredDate} · ${hire.day}${hire.statusLabel ? ` · ${hire.statusLabel}` : ""}`}
                    </div>
                  </div>
                  <span className={`chip ${hire.dnaChipClass}`}>DNA fit {hire.dnaFit}</span>
                </div>
                {hire.id === "anya" && <span className="chip chip-g">All check-ins done ✓</span>}
                {hire.id === "tom" && (
                  <div style={{ display: "flex", gap: 7 }}>
                    <span className="chip chip-c">Day 7 pulse due</span>
                    <button className="btn btn-violet btn-sm" onClick={() => showToast("90-day pulse sent — you&apos;ll be notified when they respond", "success")}>Send pulse →</button>
                  </div>
                )}
                {hire.id === "james" && (
                  <div style={{ display: "flex", gap: 7 }}>
                    <span className="chip chip-r">30-day overdue</span>
                    <button className="btn btn-sm" style={{ background: "var(--red-lt)", border: "1px solid rgba(251,113,133,.4)", color: "var(--red)" }} onClick={() => showToast("Urgent pulse sent — flagged for your attention", "default")}>Act now →</button>
                  </div>
                )}
              </div>

              <div className="hire-timeline">
                {hire.steps.map((step, i) => (
                  <div key={i} className="ht-step">
                    <DotEl step={step} />
                    <div className="ht-label">{step.label}</div>
                    <div className="ht-date">{step.date}</div>
                  </div>
                ))}
              </div>

              {hire.health && (
                <div className="health-score" style={hire.atRisk ? { borderColor: "rgba(251,113,133,.25)" } : {}}>
                  <div>
                    <div className="hs-val" style={{ color: hire.health.color }}>{hire.health.score}</div>
                    <div className="hs-lbl">Health score</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>{hire.health.desc}</div>
                    <div className="hs-trend">
                      {hire.health.bars.map((b, i) => (
                        <div key={i} className="hs-trend-bar" style={{ width: `${b.w}%`, background: b.bg }} />
                      ))}
                    </div>
                  </div>
                  {hire.atRisk ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <button className="btn btn-ghost btn-sm">View feedback →</button>
                      <button className="btn btn-sm" style={{ background: "var(--violet-lt)", borderColor: "var(--violet-md)", color: "#a78bfa" }}>🧬 DNA tip</button>
                    </div>
                  ) : (
                    <button className="btn btn-ghost btn-sm">View feedback →</button>
                  )}
                </div>
              )}

              {hire.pulse && (
                <div style={{ padding: "10px 14px", borderRadius: "var(--r)", background: "rgba(56,189,248,.08)", border: "1px solid rgba(56,189,248,.2)", fontSize: 12, color: "var(--text2)", marginTop: 10 }}>
                  💬 Hiro sends Tom a 3-question pulse today — anonymous until you both agree to share. Takes 45 seconds.
                </div>
              )}

              {hire.atRisk && (
                <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: "var(--r)", background: "rgba(251,113,133,.06)", border: "1px solid rgba(251,113,133,.2)", fontSize: 12, color: "var(--text2)" }}>
                  🧬 <strong style={{ color: "var(--red)" }}>DNA coaching tip:</strong> James prefers diplomatic feedback. Your team is predominantly direct. This tension is likely the source. Have a working-style conversation this week.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
