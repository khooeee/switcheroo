import type { FindInSessionsHit } from "../../shared/findInSessionsHit";
import type { TranscriptItem, TranscriptTurn } from "../../shared/transcript";
import type { FindSource } from "./FindSource";
import { matchSnippet } from "./matchSnippet";

function turnItems(turn: TranscriptTurn): TranscriptItem[] {
  const items = [turn.user, ...turn.events];
  if (turn.assistant) items.push(turn.assistant);
  return items;
}

/** Case-insensitive substring hits in one session's transcript, in transcript order. */
export function findInSessionSource(source: FindSource, query: string): FindInSessionsHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const hits: FindInSessionsHit[] = [];
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
  return hits;
}
