import type { TranscriptTurn } from "../../../shared/types";

/** User + final assistant event ids in feed order (main transcript / Switchboard only). */
export function selectableFeedEventIds(turns: TranscriptTurn[]): string[] {
  const ids: string[] = [];
  for (const turn of turns) {
    ids.push(turn.user.id);
    if (turn.assistant) ids.push(turn.assistant.id);
  }
  return ids;
}
