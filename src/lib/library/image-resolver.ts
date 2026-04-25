import { convertFileSrc } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri/fs";

const ABSOLUTE_URL = /^([a-z][a-z0-9+\-.]*:|\/\/|data:|asset:)/i;

/**
 * Resolve a possibly-relative image src against the directory of the file
 * containing it, returning an asset:// URL the Tauri WebView can fetch.
 *
 * - Pass-through for http(s)://, data:, asset://, protocol-relative URLs.
 * - In a non-Tauri context, returns the original src unchanged.
 */
export function resolveImagePath(src: string, fileDir: string | undefined): string {
  if (!src) return src;
  if (ABSOLUTE_URL.test(src)) return src;
  if (!fileDir || !isTauri()) return src;
  const abs = `${fileDir.replace(/[\\/]+$/, "")}/${src.replace(/^[\\/]+/, "")}`;
  try {
    return convertFileSrc(abs);
  } catch {
    return src;
  }
}

/**
 * Rewrite every `![alt](src)` reference in a markdown string so the resolved
 * path is what TipTap / marked downstream will render.
 */
export function rewriteMarkdownImages(markdown: string, fileDir: string | undefined): string {
  if (!fileDir || !isTauri()) return markdown;
  return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (full, alt, src) => {
    const resolved = resolveImagePath((src as string).trim(), fileDir);
    return `![${alt}](${resolved})`;
  });
}
