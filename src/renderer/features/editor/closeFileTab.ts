import { explorerStore } from "../explorer/explorerStore";
import { fileBufferStore } from "./fileBufferStore";
import { fileScrollMemory } from "./fileScrollMemory";
import { resolveUnsavedFiles } from "./resolveUnsavedFiles";

/** Close an editor tab, asking to save unsaved edits first. False when the user cancels or the save fails. */
export async function closeFileTab(sessionId: string, path: string): Promise<boolean> {
  if (fileBufferStore.isDirty(sessionId, path) && !(await resolveUnsavedFiles([{ sessionId, path }]))) {
    return false;
  }
  explorerStore.closeFile(sessionId, path);
  fileBufferStore.drop(sessionId, path);
  fileScrollMemory.delete(sessionId, path);
  return true;
}
