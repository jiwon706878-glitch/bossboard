import matter from "gray-matter";

export interface Frontmatter {
  id: string;
  title: string;
  tags?: string[];
  agent_access?: string[];
  created?: string;
  modified?: string;
  hash?: string;
}

export interface ParsedMarkdown {
  frontmatter: Frontmatter;
  content: string;
  raw: string;
}

export function parseMarkdown(raw: string): ParsedMarkdown {
  try {
    const parsed = matter(raw);
    return {
      frontmatter: parsed.data as Frontmatter,
      content: parsed.content,
      raw,
    };
  } catch {
    return {
      frontmatter: { id: generateId(), title: "Untitled" },
      content: raw,
      raw,
    };
  }
}

export function stringifyMarkdown(fm: Frontmatter, content: string): string {
  return matter.stringify(content, fm as unknown as Record<string, unknown>);
}

export function generateId(): string {
  return `wiki_${Math.random().toString(36).substring(2, 15)}`;
}

export function computeHash(content: string): string {
  let h = 0;
  for (let i = 0; i < content.length; i++) {
    h = ((h << 5) - h + content.charCodeAt(i)) | 0;
  }
  return `sha1:${h.toString(16)}`;
}

export function contentPreview(content: string, maxLen = 200): string {
  return content.replace(/\s+/g, " ").trim().slice(0, maxLen);
}
