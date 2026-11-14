import { explorerStore } from "../explorer/explorerStore";
import { fileBufferStore } from "./fileBufferStore";
import { fileScrollMemory } from "./fileScrollMemory";

/** Show a file in the preview tab, forgetting the file it replaces (never unsaved: an edit keeps the tab). */
export function previewFileTab(sessionId: string, path: string): void {
  const replaced = explorerStore.previewFile(sessionId, path);
  if (replaced === null) return;
  fileBufferStore.drop(sessionId, replaced);
  fileScrollMemory.delete(sessionId, replaced);
}
