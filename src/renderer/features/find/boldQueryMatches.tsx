import type { ReactNode } from "react";

/** Wrap case-insensitive occurrences of query in <strong>. */
export function boldQueryMatches(text: string, query: string): ReactNode {
  const needle = query.trim();
  if (!needle) return text;
  const lower = text.toLowerCase();
  const q = needle.toLowerCase();
  const parts: ReactNode[] = [];
  let start = 0;
  let key = 0;
  while (start < text.length) {
    const idx = lower.indexOf(q, start);
    if (idx < 0) {
      parts.push(text.slice(start));
      break;
    }
    if (idx > start) parts.push(text.slice(start, idx));
    parts.push(<strong key={key++}>{text.slice(idx, idx + q.length)}</strong>);
    start = idx + q.length;
  }
  return parts.length === 1 ? parts[0] : parts;
}
