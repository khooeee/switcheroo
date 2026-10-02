import type { TranscriptTurn } from "../../../shared/types";

/** All event ids in a turn, in reading order (user → mid-turn → assistant). */
export function detailEventIds(turn: TranscriptTurn): string[] {
  const ids = [turn.user.id, ...turn.events.map((event) => event.id)];
  if (turn.assistant) ids.push(turn.assistant.id);
  return ids;
}
