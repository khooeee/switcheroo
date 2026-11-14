import { errorMessage } from "../../../shared/errorMessage";
import { explorerStore } from "../explorer/explorerStore";
import { baseName } from "./baseName";
import { fileBufferStore } from "./fileBufferStore";
import { fileScrollMemory } from "./fileScrollMemory";
import { isUntitledPath } from "./isUntitledPath";
import { languageFor } from "./languageFor";

/**
 * Save As: ask where to write a tab's text, then turn the tab into that file, with its undo
 * history, cursor and scroll position. The file left behind keeps what it had on disk.
 * Answers with the new path, or null when cancelled or the write failed.
 */
export async function saveFileAs(sessionId: string, path: string): Promise<string | null> {
  const buffer = fileBufferStore.get(sessionId, path);
  if (buffer?.kind !== "text") return null;
  const { state } = buffer.live;
  try {
    const suggested = isUntitledPath(path) ? baseName(path) : path;
    const written = await window.switcheroo.saveSessionFileAs(sessionId, suggested, state.sliceDoc());
    if (!written) return null;
    const language = await languageFor(written.path);
    // Buffer, scroll and tab move in one step, so the editor never renders the tab without its buffer.
    fileBufferStore.moveTo(sessionId, path, written.path, state.doc, written.mtimeMs, language);
    if (written.path !== path) {
      fileScrollMemory.move(sessionId, path, written.path);
      explorerStore.renameFile(sessionId, path, written.path);
    }
    return written.path;
  } catch (err) {
    console.error(`[editor] save as ${path} failed:`, errorMessage(err));
    return null;
  }
}
