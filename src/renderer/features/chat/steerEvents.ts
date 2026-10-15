import type { TranscriptItem } from "../../../shared/transcript";

const NONE: TranscriptItem[] = [];

/** Steers (prompts sent mid-turn) land as user events; they stay visible in the main feed. */
export function steerEvents(events: readonly TranscriptItem[]): TranscriptItem[] {
  const steers = events.filter((event) => event.role === "user");
  // A shared empty list keeps memoized TurnEvents stable while a turn without steers streams.
  return steers.length ? steers : NONE;
}
