import { fileBufferStore } from "../editor/fileBufferStore";
import { dirListingStore } from "./dirListingStore";
import { explorerStore } from "./explorerStore";
import { parentPath } from "./parentPath";

/**
 * Re-read what changed on disk: affected loaded folders and open files. `paths` null (too many
 * changes, or catching up after being hidden) re-reads everything the session has loaded.
 */
export function refreshSessionFiles(sessionId: string, paths: string[] | null): void {
  const loaded = dirListingStore.loadedPaths(sessionId);
  const { openFiles } = explorerStore.get(sessionId);
  if (paths === null) {
    loaded.forEach((dir) => dirListingStore.refresh(sessionId, dir));
    openFiles.forEach((file) => void fileBufferStore.reload(sessionId, file));
    return;
  }
  const loadedSet = new Set(loaded);
  const dirs = new Set<string>();
  for (const path of paths) {
    if (loadedSet.has(parentPath(path))) dirs.add(parentPath(path));
    if (loadedSet.has(path)) dirs.add(path);
  }
  dirs.forEach((dir) => dirListingStore.refresh(sessionId, dir));
  // A folder event (FSEvents coalesces) covers the open files under it.
  const touched = (file: string) => paths.some((path) => file === path || file.startsWith(`${path}/`));
  openFiles.filter(touched).forEach((file) => void fileBufferStore.reload(sessionId, file));
}
