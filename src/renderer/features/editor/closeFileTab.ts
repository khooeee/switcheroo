import { explorerStore } from "../explorer/explorerStore";
import { fileBufferStore } from "./fileBufferStore";
import { fileScrollMemory } from "./fileScrollMemory";
import { resolveUnsavedFiles } from "./resolveUnsavedFiles";

/** Close an editor tab, asking to save unsaved edits first. False when the user cancels or the save fails. */
export async function closeFileTab(sessionId: string, path: string): Promise<boolean> {
  let closing = path;
  if (fileBufferStore.isDirty(sessionId, path)) {
    const resolved = await resolveUnsavedFiles([{ sessionId, path }]);
    if (!resolved) return false;
    // Saving an untitled file gave its tab the file's path.
    closing = resolved[0].path;
  }
  explorerStore.closeFile(sessionId, closing);
  fileBufferStore.drop(sessionId, closing);
  fileScrollMemory.delete(sessionId, closing);
  return true;
}
