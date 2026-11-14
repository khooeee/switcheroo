import type { TranscriptTurn } from "./transcript";

/** A due reminder recorded in the transcript; never sent to the agent. */
export function isReminderTurn(turn: TranscriptTurn): boolean {
  return turn.user.role === "reminder";
}
