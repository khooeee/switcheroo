import { explorerStore } from "./explorerStore";
import { treeReveal } from "./treeReveal";

/** Open a file in a tab, or expand a folder and move focus to the tree; either way its row scrolls into view. */
export function revealPath(sessionId: string, path: string, kind: "file" | "dir"): void {
  treeReveal.request(sessionId);
  if (kind === "file") {
    explorerStore.revealFile(sessionId, path);
    return;
  }
  explorerStore.revealFolder(sessionId, path);
  requestAnimationFrame(() => document.querySelector<HTMLElement>(".explorer-tree")?.focus());
}
