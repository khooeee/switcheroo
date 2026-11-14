import { fileBufferStore } from "./fileBufferStore";
import { resolveUnsavedFiles } from "./resolveUnsavedFiles";

/** Close a session from the UI, first offering to save its files with unsaved edits. */
export async function closeSessionSafely(sessionId: string): Promise<void> {
  const unsaved = fileBufferStore.dirtyFiles().filter((file) => file.sessionId === sessionId);
  if (!(await resolveUnsavedFiles(unsaved))) return;
  await window.switcheroo.closeSession(sessionId);
}
