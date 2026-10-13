import type { TranscriptTurn } from "../../../shared/transcript";

/** Whether `eventId` shows in the main transcript (user, steers, final assistant), not only in Turn Details. */
export function isFeedEvent(turn: TranscriptTurn, eventId: string): boolean {
  if (eventId === turn.user.id) return true;
  const running = turn.status === "running" && !turn.user.queued;
  if (!running && eventId === turn.assistant?.id) return true;
  return turn.events.some((event) => event.id === eventId && event.role === "user");
}
