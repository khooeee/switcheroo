import { baseName } from "./baseName";
import { displayPath } from "./displayPath";
import { fileBufferStore } from "./fileBufferStore";
import { saveFileTab } from "./saveFileTab";

type OpenFile = { sessionId: string; path: string };

/**
 * Ask Save / Don't Save / Cancel for files with unsaved edits. When it is fine to go on (nothing
 * was unsaved, everything saved, or the edits were dropped) answers with the files as they are
 * now named: saving an untitled file names it. Null to stop.
 */
export async function resolveUnsavedFiles(files: OpenFile[]): Promise<OpenFile[] | null> {
  if (files.length === 0) return files;
  const names = files.map((file) => displayPath(file.path));
  const choice = await window.switcheroo.confirmUnsavedChanges(files.length === 1 ? [baseName(names[0])] : names);
  if (choice === "cancel") return null;
  if (choice === "discard") {
    files.forEach((file) => fileBufferStore.drop(file.sessionId, file.path));
    return files;
  }
  // One at a time: each untitled file asks where to save.
  const saved: OpenFile[] = [];
  for (const file of files) {
    const path = await saveFileTab(file.sessionId, file.path);
    if (path === null) return null;
    saved.push({ sessionId: file.sessionId, path });
  }
  return saved;
}
