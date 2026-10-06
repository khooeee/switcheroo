import type { TranscriptItem, TranscriptTurn } from "../../../shared/transcript";

/** Latest `subagent` row for `subagentId` across transcripts (a nested subagent's row lives in its parent's). */
export function findSubagentRow(
  subagentId: string,
  transcripts: Iterable<readonly TranscriptTurn[]>,
): TranscriptItem | null {
  let found: TranscriptItem | null = null;
  for (const turns of transcripts) {
    for (const turn of turns) {
      for (const event of turn.events) {
        if (event.subagentId === subagentId && (!found || event.at >= found.at)) found = event;
      }
    }
  }
  return found;
}
