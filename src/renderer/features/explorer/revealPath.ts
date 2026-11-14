import { explorerStore } from "./explorerStore";
import { treeReveal } from "./treeReveal";

/** Open a file in a tab, or expand a folder and move focus to the tree; either way its row scrolls into view. */
export function revealPath(sessionId: string, path: string, kind: "file" | "dir"): void {
  treeReveal.request(sessionId);
  if (kind === "file") explorerStore.revealFile(sessionId, path);
  else explorerStore.revealFolder(sessionId, path);
  requestAnimationFrame(() => {
    const tree = document.querySelector<HTMLElement>(".explorer-tree");
    // A row that was already selected changes nothing, so the tree would not scroll to it by itself.
    const row = tree?.querySelector(".explorer-row.selected");
    if (row?.getAttribute("data-path") === path) {
      row.scrollIntoView({ block: "nearest" });
      treeReveal.done(sessionId);
    }
    if (kind === "dir") tree?.focus();
  });
}
