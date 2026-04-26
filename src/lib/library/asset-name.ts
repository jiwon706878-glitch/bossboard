/**
 * Normalise filenames for files that BossBoard creates inside the workspace.
 *
 * Goals:
 *   - Lowercase so cross-platform sync (NTFS case-insensitive ↔ APFS
 *     case-sensitive) doesn't end up with two copies of "Photo.png" and
 *     "photo.png".
 *   - Replace anything outside [a-z0-9가-힣\-_] with `_` so paths stay
 *     URL-safe and shell-safe.
 *   - Collapse runs of `_`, trim leading/trailing `_`.
 *   - Preserve the extension as the last `.` segment, lowercased.
 *
 * Use this helper for paste-as-attachment, drag-drop, and any
 * BB-generated file name. We do NOT rename existing user files.
 */
export function normalizeAssetName(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  let stem = filename;
  let ext = "";
  if (lastDot > 0 && lastDot < filename.length - 1) {
    stem = filename.slice(0, lastDot);
    ext = filename.slice(lastDot + 1).toLowerCase();
  }

  const safeStem = stem
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\-_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const finalStem = safeStem || "file";
  return ext ? `${finalStem}.${ext}` : finalStem;
}
