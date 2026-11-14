import { useLayoutEffect, type RefObject } from "react";
import { treeReveal } from "./treeReveal";
import type { TreeRow } from "./TreeRow";

/** After Open in Editor, scroll the selected row into view as soon as its folders have loaded. */
export function useTreeReveal(
  sessionId: string,
  scrollRef: RefObject<HTMLElement | null>,
  rows: readonly TreeRow[],
  selected: string | null,
): void {
  useLayoutEffect(() => {
    if (!treeReveal.isPending(sessionId)) return;
    const row = scrollRef.current?.querySelector(".explorer-row.selected");
    if (!row) return;
    treeReveal.done(sessionId);
    row.scrollIntoView({ block: "nearest" });
  }, [sessionId, scrollRef, rows, selected]);
}
