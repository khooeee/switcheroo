import type { AgentKind, FindInSessionsHit, TranscriptItem } from "../shared/types";

export interface SessionTranscriptSource {
  sessionId: string;
  title: string;
  agent: AgentKind;
  items: TranscriptItem[];
}

export type { FindInSessionsHit };

/** Case-insensitive substring search; hits sorted by match timestamp descending. */
export function findInSessionSources(
  sources: SessionTranscriptSource[],
  query: string,
  limit = Number.POSITIVE_INFINITY,
): FindInSessionsHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle || limit <= 0) return [];
  const hits: FindInSessionsHit[] = [];
  for (const source of sources) {
    for (const item of source.items) {
      if (!item.text.toLowerCase().includes(needle)) continue;
      hits.push({
        sessionId: source.sessionId,
        eventId: item.id,
        title: source.title,
        agent: source.agent,
        role: item.role,
        snippet: matchSnippet(item.text, needle),
        at: item.at,
      });
    }
  }
  hits.sort((a, b) => b.at - a.at);
  return Number.isFinite(limit) ? hits.slice(0, limit) : hits;
}

export function matchSnippet(text: string, needleLower: string, radius = 48): string {
  const idx = text.toLowerCase().indexOf(needleLower);
  if (idx < 0) {
    const clipped = text.slice(0, radius * 2).replace(/\s+/g, " ").trim();
    return text.length > radius * 2 ? `${clipped}…` : clipped;
  }
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + needleLower.length + radius);
  let snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < text.length) snippet = `${snippet}…`;
  return snippet;
}
