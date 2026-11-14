import { explorerStore } from "../explorer/explorerStore";
import { baseName } from "./baseName";
import { fileBufferStore } from "./fileBufferStore";
import { fileScrollMemory } from "./fileScrollMemory";

/** Close an editor tab, asking to save unsaved edits first. False when the user cancels or the save fails. */
export async function closeFileTab(sessionId: string, path: string): Promise<boolean> {
  if (fileBufferStore.isDirty(sessionId, path)) {
    const choice = await window.switcheroo.confirmUnsavedChanges([baseName(path)]);
    if (choice === "cancel") return false;
    if (choice === "save" && !(await fileBufferStore.save(sessionId, path))) return false;
  }
  explorerStore.closeFile(sessionId, path);
  fileBufferStore.drop(sessionId, path);
  fileScrollMemory.delete(`${sessionId}\0${path}`);
  return true;
}
