import { explorerPersistence } from "./explorerPersistence";
import { explorerStore } from "./explorerStore";
import { railModeStore } from "./railModeStore";
import { treeReveal } from "./treeReveal";

/** Switch to File Explorer mode with `path` (relative to the session cwd) open and shown in the tree. */
export async function openInEditor(sessionId: string, path: string): Promise<void> {
  // Saved tabs come back first; opening before that would stop them restoring.
  await explorerPersistence.ensureRestored(sessionId);
  treeReveal.request(sessionId);
  explorerStore.revealFile(sessionId, path);
  railModeStore.set("files");
}
