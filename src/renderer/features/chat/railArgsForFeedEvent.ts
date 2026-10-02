import type { TranscriptTurn } from "../../../shared/types";

/** Map a main-feed user/assistant event id to right-rail open args. */
export function railArgsForFeedEvent(
  turns: TranscriptTurn[],
  eventId: string,
): { turnId: string; focusEventId: string } | null {
  for (const turn of turns) {
    if (turn.user.id === eventId || turn.assistant?.id === eventId) {
      return { turnId: turn.id, focusEventId: eventId };
    }
  }
  return null;
}
