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
            {[{ n: "Dashboard", a: false }, { n: "Wiki", a: true }, { n: "Checklists", a: false }, { n: "Calendar", a: false }].map((item) => (
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

export function FeatureMockSearch() {
  const bd = "var(--border)"; const mt = "var(--muted)"; const mg = "var(--muted-foreground)"; const fg = "var(--foreground)"; const f = "'A2Z', sans-serif";
  return (
    <div className="p-6 h-full flex flex-col justify-center gap-3">
      <div className="rounded-md flex items-center gap-2 px-3 py-2" style={{ border: `1px solid ${bd}`, backgroundColor: mt }}>
        <span style={{ fontSize: "10px", color: mg }}>&#128269;</span>
        <span style={{ fontSize: "10px", color: fg, fontFamily: f }}>How often should we clean the tanks?</span>
      </div>
      <div className="rounded-md p-3" style={{ backgroundColor: "rgba(74,108,247,0.05)", border: "1px solid rgba(74,108,247,0.15)" }}>
        <div className="flex items-center gap-1 mb-1.5"><span style={{ fontSize: "8px", color: "#4A6CF7", fontWeight: 600, fontFamily: f }}>AI Answer</span></div>
        <div style={{ fontSize: "9px", color: fg, lineHeight: 1.5, fontFamily: f }}>CIP cleaning should be performed after every brew cycle, typically every 24-48 hours. See &quot;CIP Cleaning Guide&quot; for details.</div>
      </div>
      {["CIP Cleaning Guide", "Equipment Maintenance"].map((t) => (
        <div key={t} className="flex items-center gap-2 rounded-md px-3 py-1.5" style={{ border: `1px solid ${bd}` }}>
          <div className="h-2.5 w-2.5 rounded" style={{ backgroundColor: mt, border: `1px solid ${bd}` }} />
          <span style={{ fontSize: "9px", color: fg, fontFamily: f }}>{t}</span>
        </div>
      ))}
    </div>
  );
}

export function FeatureMockChecklist() {
  const bd = "var(--border)"; const mg = "var(--muted-foreground)"; const fg = "var(--foreground)"; const f = "'A2Z', sans-serif"; const m = "'JetBrains Mono', monospace";
  const items = [
    { t: "Pre-heat water to 60\u00b0C", done: true }, { t: "Add alkaline cleaner (2%)", done: true }, { t: "Circulate for 20 minutes", done: true },
    { t: "Rinse with clean water", done: false }, { t: "Sanitize with peracetic acid", done: false }, { t: "Final rinse and visual check", done: false },
  ];
  return (
    <div className="p-6 h-full flex flex-col justify-center">
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontSize: "11px", fontWeight: 600, color: fg, fontFamily: f }}>Daily CIP Checklist</span>
        <span style={{ fontSize: "9px", fontFamily: m, color: "#34D399" }}>3/6</span>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.t} className="flex items-center gap-2">
            <div className="h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0" style={{ borderColor: item.done ? "#34D399" : bd, backgroundColor: item.done ? "rgba(52,211,153,0.1)" : "transparent" }}>
              {item.done && <span style={{ fontSize: "8px", color: "#34D399" }}>&#10003;</span>}
            </div>
            <span style={{ fontSize: "9px", color: item.done ? mg : fg, fontFamily: f, textDecoration: item.done ? "line-through" : "none" }}>{item.t}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 h-1.5 w-full rounded-full" style={{ backgroundColor: "var(--muted)" }}>
        <div className="h-full rounded-full" style={{ width: "50%", backgroundColor: "#34D399" }} />
      </div>
    </div>
  );
}

export function FeatureMockDocHub() {
  const bd = "var(--border)"; const mt = "var(--muted)"; const mg = "var(--muted-foreground)"; const fg = "var(--foreground)"; const f = "'A2Z', sans-serif";
  return (
    <div className="p-6 h-full flex flex-col justify-center gap-3">
      <div className="flex items-center gap-3 rounded-md p-3" style={{ border: `1px dashed ${bd}` }}>
        {[{ ext: "PDF", c: "#E74C3C" }, { ext: "DOCX", c: "#2B7CD3" }, { ext: "IMG", c: "#8B5CF6" }].map((file) => (
          <div key={file.ext} className="flex items-center gap-1.5 rounded px-2 py-1.5" style={{ backgroundColor: mt, border: `1px solid ${bd}` }}>
            <div className="h-4 w-4 rounded flex items-center justify-center" style={{ backgroundColor: `${file.c}20` }}>
              <span style={{ fontSize: "6px", fontWeight: 700, color: file.c }}>{file.ext}</span>
            </div>
            <div className="h-2 w-10 rounded" style={{ backgroundColor: bd }} />
          </div>
        ))}
      </div>
      <div className="flex justify-center" style={{ color: "#4A6CF7", fontSize: "14px" }}>&#8595;</div>
      <div className="rounded-md p-3" style={{ border: `1px solid ${bd}`, borderLeft: "3px solid #34D399" }}>
        <div style={{ fontSize: "10px", fontWeight: 600, color: fg, fontFamily: f }}>Structured SOP</div>
        <div className="mt-1.5 space-y-1">
          {["1. Purpose", "2. Scope", "3. Step-by-step procedure", "4. Checklist summary"].map((s) => (
            <div key={s} style={{ fontSize: "8px", color: mg, fontFamily: f }}>{s}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
