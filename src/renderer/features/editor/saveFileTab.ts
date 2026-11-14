import { fileBufferStore } from "./fileBufferStore";
import { isUntitledPath } from "./isUntitledPath";
import { saveFileAs } from "./saveFileAs";

/** Save a tab's edits; an untitled file asks where to go first. The tab's path afterwards, or null when nothing was saved. */
export async function saveFileTab(sessionId: string, path: string): Promise<string | null> {
  if (isUntitledPath(path)) return saveFileAs(sessionId, path);
  return (await fileBufferStore.save(sessionId, path)) ? path : null;
}
