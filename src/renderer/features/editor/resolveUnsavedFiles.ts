import { baseName } from "./baseName";
import { fileBufferStore } from "./fileBufferStore";

type OpenFile = { sessionId: string; path: string };

/**
 * Ask Save / Don't Save / Cancel for files with unsaved edits. True when it is fine to go on:
 * nothing was unsaved, everything saved, or the edits were dropped.
 */
export async function resolveUnsavedFiles(files: OpenFile[]): Promise<boolean> {
  if (files.length === 0) return true;
  const names = files.length === 1 ? [baseName(files[0].path)] : files.map((file) => file.path);
  const choice = await window.switcheroo.confirmUnsavedChanges(names);
  if (choice === "cancel") return false;
  if (choice === "discard") {
    files.forEach((file) => fileBufferStore.drop(file.sessionId, file.path));
    return true;
  }
  const saved = await Promise.all(files.map((file) => fileBufferStore.save(file.sessionId, file.path)));
  return saved.every(Boolean);
}
