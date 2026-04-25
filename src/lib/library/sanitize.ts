import DOMPurify from "isomorphic-dompurify";

const SAFE_CONFIG = {
  ALLOWED_TAGS: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "br",
    "hr",
    "strong",
    "em",
    "u",
    "s",
    "code",
    "pre",
    "blockquote",
    "ul",
    "ol",
    "li",
    "a",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "span",
    "div",
  ],
  ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "id"],
  FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "style"],
  FORBID_ATTR: ["onclick", "onerror", "onload", "onmouseover", "onfocus", "formaction"],
  ALLOW_DATA_ATTR: false,
};

/**
 * Defence in depth — `tiptap-markdown` already runs with `html: false` so
 * raw HTML tags in markdown are turned into text. This wraps anywhere we
 * still pipe content through HTML in case future renderers don't.
 */
export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, SAFE_CONFIG);
}
