import type { FileChange } from "../../shared/fileChange";
import type { TranscriptItem } from "../../shared/transcript";

/** A turn's file changes: every change its events reported, in order. */
export function aggregateFileChanges(events: TranscriptItem[]): FileChange[] {
  const out: FileChange[] = [];
  for (const event of events) {
    if (event.fileChanges?.length) out.push(...event.fileChanges);
  }
  return out;
}
