import { useCallback, useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { dirListingStore } from "./dirListingStore";
import { explorerStore } from "./explorerStore";
import { FileTreeRow } from "./FileTreeRow";
import { treeKeyAction } from "./treeKeyAction";
import type { TreeRow } from "./TreeRow";
import { treeScrollMemory } from "./treeScrollMemory";
import { useDirListings } from "./useDirListings";
import { useExplorerState } from "./useExplorerState";
import { useRestoredScroll } from "./useRestoredScroll";
import { useSessionFileWatch } from "./useSessionFileWatch";
import { visibleTreeRows } from "./visibleTreeRows";

/** The session's project folder as an expandable tree. Click a folder to expand it; double-click a file to open it. */
export function FileTree({ sessionId }: { sessionId: string }) {
  const state = useExplorerState(sessionId);
  const listings = useDirListings(sessionId);
  const expanded = useMemo(() => new Set(state.expanded), [state.expanded]);
  const rows = useMemo(() => visibleTreeRows(listings, expanded), [listings, expanded]);
  const scrollRef = useRef<HTMLDivElement>(null);
  useRestoredScroll(sessionId, scrollRef, rows, treeScrollMemory);
  useSessionFileWatch(sessionId);

  useEffect(() => {
    dirListingStore.ensure(sessionId, "");
    for (const row of rows) {
      if (row.kind === "dir" && row.expanded) dirListingStore.ensure(sessionId, row.path);
    }
  }, [sessionId, rows]);

  const onRowClick = useCallback((path: string, kind: TreeRow["kind"]) => {
    explorerStore.select(sessionId, path);
    if (kind === "dir") {
      explorerStore.setExpanded(sessionId, path, !explorerStore.get(sessionId).expanded.includes(path));
    }
  }, [sessionId]);

  const onRowDoubleClick = useCallback((path: string, kind: TreeRow["kind"]) => {
    if (kind === "file") explorerStore.openFile(sessionId, path);
  }, [sessionId]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const action = treeKeyAction(rows, state.selected, event.key);
    if (!action) return;
    event.preventDefault();
    if (action.type === "select") explorerStore.select(sessionId, action.path);
    else if (action.type === "expand") explorerStore.setExpanded(sessionId, action.path, action.open);
    else explorerStore.openFile(sessionId, action.path);
    requestAnimationFrame(() => {
      scrollRef.current?.querySelector(".explorer-row.selected")?.scrollIntoView({ block: "nearest" });
    });
  };

  const root = listings[""];
  return (
    <div
      ref={scrollRef}
      className="explorer-tree"
      role="tree"
      aria-label="Files"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {root && "error" in root ? <div className="explorer-empty">{root.error}</div> : null}
      {root && "entries" in root && root.entries.length === 0 ? (
        <div className="explorer-empty">This folder is empty.</div>
      ) : null}
      {rows.map((row) => (
        <FileTreeRow
          key={row.path}
          {...row}
          selected={row.path === state.selected}
          onClick={onRowClick}
          onDoubleClick={onRowDoubleClick}
        />
      ))}
    </div>
  );
}
