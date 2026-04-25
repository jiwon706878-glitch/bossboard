/** Paths we never let a user pick as their workspace root. */
const FORBIDDEN_EXACT = new Set(
  [
    "C:",
    "C:\\",
    "C:/",
    "/",
    "/System",
    "/usr",
    "/etc",
    "/private",
    "/Library",
    "/Applications",
  ].map((s) => s.toLowerCase()),
);

const FORBIDDEN_PREFIXES = [
  "c:\\windows",
  "c:/windows",
  "c:\\program files",
  "c:/program files",
  "c:\\programdata",
  "c:/programdata",
  "/system/",
  "/usr/",
  "/etc/",
  "/private/",
];

function normalize(p: string): string {
  return p.trim().replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

export function isPathSafe(path: string): { safe: boolean; reason?: string } {
  if (!path?.trim()) return { safe: false, reason: "Path is empty." };

  const exactCmp = path.trim().replace(/\/+$/, "").toLowerCase();
  if (FORBIDDEN_EXACT.has(exactCmp)) {
    return { safe: false, reason: `${path} is a system root and cannot host the workspace.` };
  }
  const norm = normalize(path);
  for (const prefix of FORBIDDEN_PREFIXES) {
    if (norm === prefix || norm.startsWith(prefix + "/")) {
      return {
        safe: false,
        reason: `${path} is inside a protected system directory.`,
      };
    }
  }
  return { safe: true };
}
