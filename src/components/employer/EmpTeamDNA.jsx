import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";

const MEMBERS = [
  { id: "jd", initials: "JD", name: "Jamie Doe", role: "Head of Product", grad: "var(--violet-grad)", bars: [65, 85, 70, 90, 75] },
  { id: "sk", initials: "SK", name: "Sam Kim", role: "Sr Engineer", grad: "linear-gradient(135deg,#0d9488,#0891b2)", bars: [80, 90, 55, 95, 60] },
  { id: "pl", initials: "PL", name: "Priya Lee", role: "Data Analyst", grad: "linear-gradient(135deg,#f59e0b,#d97706)", bars: [75, 95, 80, 70, 85] },
  { id: "ml", initials: "ML", name: "Mei Lin", role: "Sr PM", grad: "linear-gradient(135deg,#ec4899,#be185d)", bars: [60, 75, 85, 65, 70] },
];

const BAR_COLORS = ["#38bdf8", "#a78bfa", "#ec4899", "#22c55e", "#f59e0b"];
const BAR_LABELS = ["Energy", "Decision", "Feedback", "Rhythm", "Growth"];

const GAPS = [
  { label: "Collaborative energy", fill: 32, ideal: 55, grad: "linear-gradient(90deg,#38bdf8,#6c47ff)" },
  { label: "Instinct-led decisions", fill: 18, ideal: 35, grad: "linear-gradient(90deg,#f59e0b,#ec4899)" },
  { label: "Diplomatic feedback", fill: 26, ideal: 45, grad: "linear-gradient(90deg,#ec4899,#a78bfa)" },
];

const IMPACT = [
  { label: "Collaborative energy", before: 32, after: 43, delta: "+11%", grad: "linear-gradient(90deg,#22c55e,#38bdf8)" },
  { label: "Instinct-led", before: 18, after: 26, delta: "+8%", grad: "linear-gradient(90deg,#22c55e,#f59e0b)" },
];

export default function EmpTeamDNA() {
  const { showToast } = useApp();
  const { profile } = useAuth();
  const [activeId, setActiveId] = useState("jd");

  return (
    <div className="view">
      <div className="scroll">
        <div className="page-hdr">
          <div>
            <div className="eyebrow">New feature</div>
            <div className="page-title">Team DNA</div>
            <div className="page-sub">How your team actually works — not how your job spec says you work.</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => showToast("Invite sent! They&apos;ll get an email to set their DNA profile", "success")}>+ Invite member</button>
            <button className="btn btn-dna btn-sm" onClick={() => showToast("DNA report link copied to clipboard", "success")}>Share DNA report</button>
          </div>
        </div>

        {/* Hero */}
        <div className="tdna-hero" style={{ marginBottom: 16 }}>
          <div className="tdna-hero-inner">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(236,72,153,.8)", marginBottom: 8 }}>◆ {profile?.company_name || 'Monzo'} · Payments Squad</div>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", marginBottom: 8 }}>Your team&apos;s working fingerprint</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,.5)", maxWidth: 440, lineHeight: 1.7, marginBottom: 14 }}>Built from 5 assessments. Used to match candidates who&apos;ll actually thrive — work-style compatible, not just skill-fit.</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="chip chip-p">Async-first 68%</span>
                  <span className="chip chip-c">Data-driven 82%</span>
                  <span className="chip chip-v">High-ownership 91%</span>
                </div>
              </div>
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "rgba(255,255,255,.4)", marginBottom: 6 }}>Team DNA score</div>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 36, fontWeight: 800, color: "#fff", lineHeight: 1 }}>8.4</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 4 }}>Top 18% of teams</div>
              </div>
            </div>
          </div>
        </div>

        <div className="g2">
          <div>
            {/* Team members */}
            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div className="card-title" style={{ marginBottom: 0 }}>Team members</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>Click for individual DNA</div>
              </div>
              <div className="team-grid">
                {MEMBERS.map(m => (
                  <div
                    key={m.id}
                    className={`team-member-card${activeId === m.id ? " active-member" : ""}`}
                    onClick={() => setActiveId(m.id)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                      <div className="tmc-av" style={{ background: m.grad }}>{m.initials}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text2)" }}>{m.role}</div>
                      </div>
                    </div>
                    <div className="tmc-dna-bar">
                      {m.bars.map((h, i) => (
                        <div key={i} className="tmc-seg" style={{ background: BAR_COLORS[i], height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", fontSize: 10, color: "var(--text3)", flexWrap: "wrap", marginTop: 12 }}>
                {BAR_LABELS.map((l, i) => (
                  <span key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, background: BAR_COLORS[i], borderRadius: 2, display: "inline-block" }} />
                    {l}
                  </span>
                ))}
              </div>
            </div>

            {/* Gap analysis */}
            <div className="dna-gap-card">
              <div className="dna-gap-title">⚠ Team DNA gaps — what the next hire should fill</div>
              <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 12 }}>Current team average vs ideal balance. Orange markers = ideal.</div>
              {GAPS.map(g => (
                <div key={g.label} className="gap-dim">
                  <span className="gap-dim-lbl">{g.label}</span>
                  <div className="gap-track">
                    <div className="gap-fill" style={{ width: `${g.fill}%`, background: g.grad }} />
                    <div className="gap-ideal" style={{ left: `${g.ideal}%` }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", width: 28, textAlign: "right" }}>{g.fill}%</span>
                </div>
              ))}
            </div>

            {/* Hire impact */}
            <div className="hire-impact">
              <div className="hi-title">✦ If Sarah Chen joins — team DNA shift</div>
              <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 12 }}>Sarah scores 65% collaborative. Here&apos;s how the team DNA moves.</div>
              {IMPACT.map(d => (
                <div key={d.label} className="hi-dim">
                  <span className="hi-lbl">{d.label}</span>
                  <div className="hi-track"><div className="hi-fill" style={{ width: `${d.before}%`, background: "rgba(255,255,255,.2)" }} /></div>
                  <span className="hi-arrow">→</span>
                  <div className="hi-track"><div className="hi-fill" style={{ width: `${d.after}%`, background: d.grad }} /></div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green)", width: 36, textAlign: "right" }}>{d.delta}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            {/* Radar */}
            <div className="card" style={{ marginBottom: 12, textAlign: "center" }}>
              <div className="card-title" style={{ textAlign: "left" }}>Team DNA radar</div>
              <svg width="210" height="210" viewBox="0 0 220 220" style={{ margin: "0 auto", display: "block" }}>
                <polygon points="110,30 178,72 178,148 110,190 42,148 42,72" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="1"/>
                <polygon points="110,50 163,83 163,137 110,170 57,137 57,83" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="1"/>
                <polygon points="110,70 148,94 148,126 110,150 72,126 72,94" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="1"/>
                <line x1="110" y1="110" x2="110" y2="30" stroke="rgba(255,255,255,.06)" strokeWidth="1"/>
                <line x1="110" y1="110" x2="178" y2="72" stroke="rgba(255,255,255,.06)" strokeWidth="1"/>
                <line x1="110" y1="110" x2="178" y2="148" stroke="rgba(255,255,255,.06)" strokeWidth="1"/>
                <line x1="110" y1="110" x2="110" y2="190" stroke="rgba(255,255,255,.06)" strokeWidth="1"/>
                <line x1="110" y1="110" x2="42" y2="148" stroke="rgba(255,255,255,.06)" strokeWidth="1"/>
                <line x1="110" y1="110" x2="42" y2="72" stroke="rgba(255,255,255,.06)" strokeWidth="1"/>
                <polygon points="110,52 165,80 162,142 110,175 55,140 58,80" fill="rgba(108,71,255,0.18)" stroke="#6c47ff" strokeWidth="1.5"/>
                <polygon points="110,42 172,74 172,148 110,182 48,148 48,74" fill="none" stroke="rgba(236,72,153,.4)" strokeWidth="1" strokeDasharray="4,3"/>
                <circle cx="110" cy="52" r="4" fill="#38bdf8"/><circle cx="165" cy="80" r="4" fill="#a78bfa"/>
                <circle cx="162" cy="142" r="4" fill="#ec4899"/><circle cx="110" cy="175" r="4" fill="#22c55e"/>
                <circle cx="55" cy="140" r="4" fill="#f59e0b"/><circle cx="58" cy="80" r="4" fill="#38bdf8"/>
                <text x="110" y="22" textAnchor="middle" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="Inter">Energy</text>
                <text x="192" y="74" textAnchor="start" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="Inter">Decision</text>
                <text x="192" y="148" textAnchor="start" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="Inter">Feedback</text>
                <text x="110" y="206" textAnchor="middle" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="Inter">Rhythm</text>
                <text x="28" y="148" textAnchor="end" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="Inter">Growth</text>
                <text x="28" y="74" textAnchor="end" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="Inter">Agility</text>
              </svg>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8, fontSize: 10 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#a78bfa" }}><span style={{ width: 12, height: 2, background: "#6c47ff", display: "inline-block" }} />Your team</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#f9a8d4" }}><span style={{ width: 12, height: 1, borderTop: "1px dashed rgba(236,72,153,.6)", display: "inline-block" }} />Ideal</span>
              </div>
            </div>

            {/* Archetype */}
            <div className="card2" style={{ borderColor: "rgba(236,72,153,.25)", background: "linear-gradient(135deg,rgba(236,72,153,.06),rgba(108,71,255,.06))", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#f9a8d4", marginBottom: 8 }}>DNA archetype</div>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 6 }}>The Builders</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", lineHeight: 1.65 }}>High ownership, data-first, async by default. Ship fast, question everything. Missing: someone to read the room and bridge alignment during critical decisions.</div>
            </div>

            {/* Hiring insights */}
            <div className="card2">
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--text3)", marginBottom: 10 }}>Hiring insights</div>
              <div style={{ fontSize: 12, color: "var(--text2)", display: "flex", flexDirection: "column", gap: 8 }}>
                <div>🎯 Sr PM search — surfacing 60%+ collaborative candidates first</div>
                <div>⚠ Priya Kapoor DNA 79% — culture tension risk, discuss in interview</div>
                <div>✨ Sarah Chen — would close all 3 DNA gaps</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
