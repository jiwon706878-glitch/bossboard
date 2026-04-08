/* ─── Inline mini-mockup components for the marketing landing page ──────── */

export function HeroMockup() {
  const f = "'A2Z', sans-serif";
  const m = "'JetBrains Mono', monospace";
  const bd = "var(--border)";
  const mt = "var(--muted)";
  const mg = "var(--muted-foreground)";
  const fg = "var(--foreground)";
  const bg = "var(--background)";
  const cd = "var(--card)";
  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: cd, border: `1px solid ${bd}`, boxShadow: "0 24px 64px -16px rgba(0,0,0,0.2)" }}>
      <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: bd, backgroundColor: bg }}>
        <div className="flex gap-1.5"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#FF5F57" }} /><div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#FEBC2E" }} /><div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#28C840" }} /></div>
        <div className="flex-1" />
        <div className="h-3 w-16 rounded" style={{ backgroundColor: mt }} />
      </div>
      <div style={{ display: "flex", minHeight: "320px" }}>
        <div style={{ width: "130px", borderRight: `1px solid ${bd}`, backgroundColor: bg, padding: "10px 8px", flexShrink: 0 }}>
          <div className="flex items-center gap-1.5 mb-3 px-1">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: "#4A6CF7" }} />
            <span style={{ fontSize: "10px", fontWeight: 600, color: fg, fontFamily: f }}>BossBoard</span>
          </div>
          <div className="space-y-0.5">
            {[{ n: "Dashboard", a: false }, { n: "Wiki", a: true }, { n: "Calendar", a: false }, { n: "Board", a: false }].map((item) => (
              <div key={item.n} className="flex items-center gap-1.5 rounded px-1.5 py-1" style={{ backgroundColor: item.a ? "rgba(74,108,247,0.1)" : "transparent" }}>
                <div className="h-2.5 w-2.5 rounded" style={{ backgroundColor: item.a ? "#4A6CF7" : bd }} />
                <span style={{ fontSize: "9px", color: item.a ? "#4A6CF7" : mg, fontFamily: f, fontWeight: item.a ? 600 : 400 }}>{item.n}</span>
              </div>
            ))}
            <div className="pt-2 px-1.5 space-y-0.5">
              <span style={{ fontSize: "8px", color: mg, fontFamily: f, textTransform: "uppercase", letterSpacing: "0.05em" }}>Folders</span>
              {["Operations", "Safety", "HR & Training"].map((folder) => (
                <div key={folder} className="flex items-center gap-1 py-0.5">
                  <span style={{ fontSize: "8px", color: mg }}>&#9660;</span>
                  <span style={{ fontSize: "9px", color: fg, fontFamily: f }}>{folder}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, padding: "12px 14px" }}>
          <div className="flex gap-2 mb-3">
            {[{ n: "24", l: "Documents", c: "#4A6CF7" }, { n: "89%", l: "Read rate", c: "#34D399" }, { n: "7", l: "Members", c: fg }].map((s) => (
              <div key={s.l} className="flex-1 rounded p-2" style={{ backgroundColor: mt, border: `1px solid ${bd}` }}>
                <div style={{ fontFamily: m, fontSize: "14px", fontWeight: 600, color: s.c, lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontSize: "8px", color: mg, marginTop: "2px" }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div className="rounded" style={{ border: `1px solid ${bd}` }}>
            {[
              { t: "Opening Checklist", type: "SOP", s: "published", c: "#34D399" },
              { t: "Equipment Maintenance", type: "SOP", s: "published", c: "#34D399" },
              { t: "CIP Cleaning Guide", type: "SOP", s: "draft", c: "#FBBF24" },
              { t: "Employee Onboarding", type: "Policy", s: "published", c: "#34D399" },
              { t: "Food Safety Protocol", type: "SOP", s: "published", c: "#34D399" },
            ].map((doc, i) => (
              <div key={doc.t} className="flex items-center gap-2 px-2.5 py-1.5" style={{ borderBottom: i < 4 ? `1px solid ${bd}` : "none" }}>
                <div className="h-2.5 w-2.5 rounded" style={{ backgroundColor: mt, border: `1px solid ${bd}` }} />
                <span style={{ fontSize: "9px", fontFamily: f, color: fg, flex: 1 }}>{doc.t}</span>
                <span style={{ fontSize: "7px", fontFamily: m, color: doc.c, backgroundColor: `${doc.c}15`, padding: "1px 4px", borderRadius: "3px" }}>{doc.s}</span>
                <span style={{ fontSize: "7px", color: mg }}>{doc.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeatureMockAi() {
  const bd = "var(--border)"; const mt = "var(--muted)"; const mg = "var(--muted-foreground)"; const fg = "var(--foreground)"; const f = "'A2Z', sans-serif";
  return (
    <div className="p-6 h-full flex flex-col justify-center gap-3 ai-mock-root">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .ai-mock-root .ai-typewriter {
            overflow: hidden; white-space: nowrap; width: 0;
            animation: ai-type 1.8s steps(38) 0.5s both;
          }
          .ai-mock-root .ai-btn-pulse {
            animation: ai-pulse 0.4s ease 2.5s both;
          }
          .ai-mock-root .ai-output-fade {
            opacity: 0;
            animation: ai-fade-up 0.6s ease 3s both;
          }
        }
        @keyframes ai-type { from { width: 0 } to { width: 100% } }
        @keyframes ai-pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.04) } }
        @keyframes ai-fade-up { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
      <div className="rounded-md p-3" style={{ border: `1px solid ${bd}`, backgroundColor: mt }}>
        <span style={{ fontSize: "9px", color: mg, fontFamily: f }}>Topic / Task</span>
        <div className="ai-typewriter mt-1" style={{ fontSize: "11px", color: fg, fontFamily: f }}>CIP cleaning procedure for brewing tanks</div>
      </div>
      <div className="ai-btn-pulse self-start rounded-md px-3 py-1.5" style={{ backgroundColor: "#4A6CF7", fontSize: "9px", color: "#fff", fontFamily: f, fontWeight: 600 }}>Generate SOP</div>
      <div className="ai-output-fade rounded-md p-3 flex-1" style={{ border: `1px solid ${bd}`, borderLeft: "3px solid #4A6CF7" }}>
        <div style={{ fontSize: "10px", fontWeight: 600, color: fg, fontFamily: f }}>CIP Cleaning Procedure</div>
        <div className="mt-2 space-y-1.5">
          {["1. Rinse with water at 60\u00b0C for 5 min", "2. Circulate alkaline solution", "3. Rinse and inspect visually", "4. Sanitize with peracetic acid"].map((s) => (
            <div key={s} style={{ fontSize: "8px", color: mg, fontFamily: f }}>{s}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FeatureMockCalendar() {
  const bd = "var(--border)"; const mt = "var(--muted)"; const mg = "var(--muted-foreground)"; const fg = "var(--foreground)"; const f = "'A2Z', sans-serif"; const m = "'JetBrains Mono', monospace";
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const cells = [
    { d: 7, ev: [] }, { d: 8, ev: [] }, { d: 9, ev: [{ c: "#378ADD", t: "Team standup" }] },
    { d: 10, ev: [{ c: "#1D9E75", t: "File taxes" }] }, { d: 11, ev: [] }, { d: 12, ev: [] }, { d: 13, ev: [] },
    { d: 14, ev: [{ c: "#378ADD", t: "Client call" }] }, { d: 15, ev: [{ c: "#EF9F27", t: "CIP checklist" }] },
    { d: 16, ev: [] }, { d: 17, ev: [{ c: "#1D9E75", t: "Order supplies" }] }, { d: 18, ev: [] }, { d: 19, ev: [] }, { d: 20, ev: [] },
  ];
  return (
    <div className="p-5 h-full flex flex-col justify-center gap-2.5">
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: "11px", fontWeight: 600, color: fg, fontFamily: f }}>April 2026</span>
        <div className="flex items-center gap-2">
          {[{ c: "#378ADD", l: "Google" }, { c: "#1D9E75", l: "Todos" }, { c: "#EF9F27", l: "Checklists" }].map((leg) => (
            <div key={leg.l} className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: leg.c }} />
              <span style={{ fontSize: "7px", color: mg, fontFamily: f }}>{leg.l}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px rounded-md overflow-hidden" style={{ border: `1px solid ${bd}` }}>
        {days.map((d, i) => (
          <div key={i} className="text-center py-1" style={{ fontSize: "7px", color: mg, fontFamily: m, backgroundColor: mt }}>{d}</div>
        ))}
        {cells.map((cell) => (
          <div key={cell.d} className="relative py-1.5 px-0.5 min-h-[36px]" style={{ backgroundColor: cell.d === 15 ? "rgba(74,108,247,0.06)" : "transparent", borderBottom: `1px solid ${bd}` }}>
            <span style={{ fontSize: "8px", color: cell.d === 15 ? "#4A6CF7" : fg, fontFamily: m, fontWeight: cell.d === 15 ? 700 : 400 }}>{cell.d}</span>
            {cell.ev.map((e) => (
              <div key={e.t} className="mt-0.5 rounded px-0.5 py-px truncate" style={{ fontSize: "6px", color: "#fff", backgroundColor: e.c }}>{e.t}</div>
            ))}
          </div>
        ))}
      </div>
      <div className="rounded-md p-2 flex items-center gap-2" style={{ backgroundColor: "rgba(55,138,221,0.06)", border: "1px solid rgba(55,138,221,0.15)" }}>
        <div className="h-5 w-5 rounded flex items-center justify-center" style={{ backgroundColor: "rgba(55,138,221,0.12)" }}>
          <span style={{ fontSize: "10px" }}>&#128197;</span>
        </div>
        <div>
          <div style={{ fontSize: "8px", fontWeight: 600, color: fg, fontFamily: f }}>Google Calendar connected</div>
          <div style={{ fontSize: "7px", color: mg, fontFamily: f }}>Syncing 3 calendars</div>
        </div>
      </div>
    </div>
  );
}

export function FeatureMockBoard() {
  const bd = "var(--border)"; const mt = "var(--muted)"; const mg = "var(--muted-foreground)"; const fg = "var(--foreground)"; const f = "'A2Z', sans-serif"; const m = "'JetBrains Mono', monospace";
  return (
    <div className="p-5 h-full flex flex-col justify-center gap-2.5">
      {/* Notice */}
      <div className="rounded-md p-2.5" style={{ border: `1px solid ${bd}`, borderLeft: "3px solid #FBBF24" }}>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="rounded px-1 py-px" style={{ fontSize: "7px", fontWeight: 600, color: "#FBBF24", backgroundColor: "rgba(251,191,36,0.1)", fontFamily: f }}>Notice</span>
          <span className="rounded px-1 py-px" style={{ fontSize: "7px", color: "#FBBF24", fontFamily: f }}>Pinned</span>
        </div>
        <div style={{ fontSize: "10px", fontWeight: 600, color: fg, fontFamily: f }}>Holiday schedule change</div>
        <div style={{ fontSize: "8px", color: mg, fontFamily: f, marginTop: "2px" }}>We&apos;re open Dec 24 until 2pm. Normal hours Dec 26.</div>
      </div>
      {/* Poll */}
      <div className="rounded-md p-2.5" style={{ border: `1px solid ${bd}` }}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="rounded px-1 py-px" style={{ fontSize: "7px", fontWeight: 600, color: "#34D399", backgroundColor: "rgba(52,211,153,0.1)", fontFamily: f }}>Poll</span>
          <span style={{ fontSize: "8px", fontWeight: 500, color: fg, fontFamily: f }}>New apron color?</span>
        </div>
        {[{ t: "Navy blue", pct: 60, v: true }, { t: "Forest green", pct: 30, v: false }, { t: "Keep black", pct: 10, v: false }].map((opt) => (
          <div key={opt.t} className="mb-1">
            <div className="flex items-center justify-between" style={{ fontSize: "8px", color: opt.v ? "#4A6CF7" : fg, fontFamily: f, fontWeight: opt.v ? 600 : 400 }}>
              <span>{opt.t}</span><span style={{ fontFamily: m, fontSize: "7px", color: mg }}>{opt.pct}%</span>
            </div>
            <div className="h-1 rounded-full" style={{ backgroundColor: mt }}>
              <div className="h-full rounded-full" style={{ width: `${opt.pct}%`, backgroundColor: opt.v ? "#4A6CF7" : bd }} />
            </div>
          </div>
        ))}
        <div style={{ fontSize: "7px", color: mg, fontFamily: m, marginTop: "2px" }}>10 votes</div>
      </div>
      {/* Threaded comment */}
      <div className="rounded-md p-2.5" style={{ border: `1px solid ${bd}` }}>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="rounded px-1 py-px" style={{ fontSize: "7px", fontWeight: 600, color: "#4A6CF7", backgroundColor: "rgba(74,108,247,0.1)", fontFamily: f }}>Discussion</span>
          <span style={{ fontSize: "8px", fontWeight: 500, color: fg, fontFamily: f }}>Weekend shift swap</span>
        </div>
        <div style={{ fontSize: "8px", color: mg, fontFamily: f }}>3 comments</div>
        <div className="mt-1.5 ml-2 pl-2" style={{ borderLeft: `2px solid ${bd}` }}>
          <div style={{ fontSize: "7px", color: fg, fontFamily: f }}><span style={{ fontWeight: 600 }}>Alex:</span> I can cover Saturday</div>
          <div style={{ fontSize: "7px", color: fg, fontFamily: f, marginTop: "1px" }}><span style={{ fontWeight: 600 }}>Jordan:</span> Works for me</div>
        </div>
      </div>
    </div>
  );
}

export function FeatureMockApi() {
  const bd = "var(--border)"; const mt = "var(--muted)"; const mg = "var(--muted-foreground)"; const fg = "var(--foreground)"; const f = "'A2Z', sans-serif"; const m = "'JetBrains Mono', monospace";
  return (
    <div className="p-5 h-full flex flex-col justify-center gap-2.5">
      {/* REST endpoint */}
      <div className="rounded-md p-2.5" style={{ backgroundColor: mt, border: `1px solid ${bd}` }}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="rounded px-1.5 py-px" style={{ fontSize: "7px", fontWeight: 700, color: "#34D399", backgroundColor: "rgba(52,211,153,0.1)", fontFamily: m }}>GET</span>
          <span style={{ fontSize: "8px", color: fg, fontFamily: m }}>/api/v1/sops</span>
        </div>
        <div style={{ fontSize: "7px", color: mg, fontFamily: m, lineHeight: 1.6 }}>
          {`{`}<br />
          {`  "data": [{ "title": "Opening ...", "status": "published" }]`}<br />
          {`  "total": 24`}<br />
          {`}`}
        </div>
      </div>
      {/* MCP connection */}
      <div className="rounded-md p-2.5" style={{ border: `1px solid ${bd}`, borderLeft: "3px solid #4A6CF7" }}>
        <div className="flex items-center gap-1.5 mb-1">
          <span style={{ fontSize: "8px", fontWeight: 600, color: "#4A6CF7", fontFamily: f }}>MCP Server</span>
          <span className="rounded-full px-1.5 py-px" style={{ fontSize: "6px", fontWeight: 600, color: "#34D399", backgroundColor: "rgba(52,211,153,0.1)", fontFamily: m }}>CONNECTED</span>
        </div>
        <div style={{ fontSize: "8px", color: fg, fontFamily: f }}>Available tools:</div>
        <div className="mt-1 space-y-0.5">
          {["read_sop", "write_sop", "log_activity", "search_wiki"].map((tool) => (
            <div key={tool} className="flex items-center gap-1.5">
              <span style={{ fontSize: "7px", color: "#4A6CF7", fontFamily: m }}>&gt;</span>
              <span style={{ fontSize: "8px", color: fg, fontFamily: m }}>{tool}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Agent log */}
      <div className="rounded-md p-2.5" style={{ backgroundColor: mt, border: `1px solid ${bd}` }}>
        <div style={{ fontSize: "8px", fontWeight: 600, color: fg, fontFamily: f, marginBottom: "3px" }}>Agent Activity</div>
        {[
          { t: "Claude wrote \"Closing Procedure\"", ago: "2m ago" },
          { t: "Cursor updated inventory SOP", ago: "15m ago" },
        ].map((log) => (
          <div key={log.t} className="flex items-center justify-between py-0.5">
            <span style={{ fontSize: "7px", color: fg, fontFamily: f }}>{log.t}</span>
            <span style={{ fontSize: "6px", color: mg, fontFamily: m }}>{log.ago}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
