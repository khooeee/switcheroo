import { isReminderTurn } from "./isReminderTurn";
import type { TranscriptTurn } from "./transcript";

/** The turns the agent took part in, without reminder markers. */
export function agentTurns(turns: TranscriptTurn[]): TranscriptTurn[] {
  return turns.filter((turn) => !isReminderTurn(turn));
}
