import type { TranscriptTurn } from "../../shared/transcript";
import { cloneTurn } from "./cloneTurn";

function hasReply(turn: TranscriptTurn): boolean {
  return turn.assistant !== null || turn.events.some((event) => event.role === "assistant");
}

/**
 * Copies of `turns` through the last assistant reply before the in-flight turn, so a fork of a
 * thinking session leaves out unfinished work and queued prompts. Null when nothing is in flight.
 */
export function clipTurnsBeforeInFlight(turns: TranscriptTurn[]): TranscriptTurn[] | null {
  const inFlight = turns.findIndex((turn) => turn.status === "running");
  if (inFlight < 0) return null;
  const settled = turns.slice(0, inFlight);
  return settled.slice(0, settled.findLastIndex(hasReply) + 1).map(cloneTurn);
}
