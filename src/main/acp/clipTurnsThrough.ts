import type { TranscriptTurn } from "../../shared/transcript";
import { aggregateFileChanges } from "./aggregateFileChanges";
import { cloneTurn } from "./cloneTurn";

/** A turn cut at the fork point will not continue, so it is no longer running. */
function settled(turn: TranscriptTurn): TranscriptTurn {
  return turn.status === "running" ? { ...turn, status: "complete" } : turn;
}

/** Copies of `turns` through `eventId` (a fork point). Null if no turn holds `eventId`. */
export function clipTurnsThrough(turns: TranscriptTurn[], eventId: string): TranscriptTurn[] | null {
  const clipped: TranscriptTurn[] = [];
  for (const turn of turns) {
    const copy = cloneTurn(turn);
    if (turn.user.id === eventId) {
      clipped.push(settled({ ...copy, assistant: null, events: [], fileChanges: [] }));
      return clipped;
    }
    if (turn.assistant?.id === eventId) {
      clipped.push(settled({ ...copy, events: [], fileChanges: [] }));
      return clipped;
    }
    const eventIdx = turn.events.findIndex((event) => event.id === eventId);
    if (eventIdx >= 0) {
      const events = copy.events.slice(0, eventIdx + 1);
      const hit = events[eventIdx]!;
      const assistant = copy.assistant && copy.assistant.at > hit.at ? null : copy.assistant;
      clipped.push(settled({ ...copy, assistant, events, fileChanges: aggregateFileChanges(events) }));
      return clipped;
    }
    clipped.push(copy);
  }
  return null;
}
