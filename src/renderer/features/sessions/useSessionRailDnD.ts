import { useRef, useState, type DragEvent as ReactDragEvent } from "react";
import type { Session } from "../../../shared/session";
import { reorderIndexAfterRemove } from "./reorderIndexAfterRemove";
import { tabDropInsertBefore } from "./tabDropInsertBefore";
import { sameTabDropTarget, type TabDropTarget } from "./tabDropTarget";

/** Drag/drop state for reordering and moving child tabs in the session rail. */
export function useSessionRailDnD(
  sessions: Session[],
  filter: string,
  onReorderTab: (sessionId: string, tabId: string, toIndex: number) => void,
  onMoveTab: (tabId: string, toSessionId: string, toIndex: number) => void,
) {
  const [dragTabId, setDragTabId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TabDropTarget | null>(null);
  const dropTargetRef = useRef<TabDropTarget | null>(null);

  const clearDrag = () => {
    setDragTabId(null);
    dropTargetRef.current = null;
    setDropTarget(null);
  };

  const onChildDragStart = (event: ReactDragEvent, tabId: string) => {
    event.dataTransfer.setData("text/tab-id", tabId);
    event.dataTransfer.effectAllowed = "move";
    setDragTabId(tabId);
  };

  const onDropTarget = (target: TabDropTarget | null) => {
    if (sameTabDropTarget(dropTargetRef.current, target)) return;
    dropTargetRef.current = target;
    setDropTarget(target);
  };

  const onChildDrop = (
    event: ReactDragEvent,
    toSessionId: string,
    visualInsertBefore: number,
  ) => {
    event.preventDefault();
    const tabId = event.dataTransfer.getData("text/tab-id") || dragTabId;
    const target = dropTargetRef.current;
    clearDrag();
    if (!tabId) return;
    const source = sessions.find((session) =>
      session.tabs.some((tab) => tab.tabId === tabId),
    );
    if (!source) return;

    const insertBefore = tabDropInsertBefore(
      sessions,
      filter,
      toSessionId,
      visualInsertBefore,
      target,
    );

    if (source.id === toSessionId) {
      const from = source.tabs.findIndex((tab) => tab.tabId === tabId);
      onReorderTab(toSessionId, tabId, reorderIndexAfterRemove(from, insertBefore));
      return;
    }
    onMoveTab(tabId, toSessionId, insertBefore);
  };

  const onGroupDrop = (event: ReactDragEvent, toSessionId: string) => {
    const session = sessions.find((item) => item.id === toSessionId);
    const target = dropTargetRef.current;
    if (target?.sessionId === toSessionId && target.mode === "insert") {
      onChildDrop(event, toSessionId, target.index);
      return;
    }
    onChildDrop(event, toSessionId, session?.tabs.length ?? 0);
  };

  return {
    dragTabId,
    dropTarget,
    clearDrag,
    onChildDragStart,
    onChildDrop,
    onDropTarget,
    onGroupDrop,
  };
}
