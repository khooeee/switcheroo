import type { AgentKind } from "../shared/agentKind";
import type { FindInSessionsHit } from "../shared/findInSessionsHit";
import type { TranscriptItem, TranscriptTurn } from "../shared/transcript";
import { matchSnippet } from "./matchSnippet";

interface SessionTranscriptSource {
  sessionId: string;
  title: string;
  agent: AgentKind;
  turns: TranscriptTurn[];
}

function turnItems(turn: TranscriptTurn): TranscriptItem[] {
  const items = [turn.user, ...turn.events];
  if (turn.assistant) items.push(turn.assistant);
  return items;
}

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
    for (const turn of source.turns) {
      for (const item of turnItems(turn)) {
        if (!item.text.toLowerCase().includes(needle)) continue;
        hits.push({
          sessionId: source.sessionId,
          turnId: turn.id,
          eventId: item.id,
          title: source.title,
          agent: source.agent,
          role: item.role,
          snippet: matchSnippet(item.text, needle),
          at: item.at,
        });
      }
    }
  }
  hits.sort((a, b) => b.at - a.at);
  return Number.isFinite(limit) ? hits.slice(0, limit) : hits;
}
