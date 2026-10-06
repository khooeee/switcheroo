import type { TranscriptItem } from "../../../shared/transcript";

/** A turn's subagent rows, one per subagent (the latest row wins when it was resumed). */
export function subagentRows(events: readonly TranscriptItem[]): TranscriptItem[] {
  const byId = new Map<string, TranscriptItem>();
  for (const event of events) {
    if (event.role === "subagent" && event.subagentId) byId.set(event.subagentId, event);
  }
  return [...byId.values()];
}
