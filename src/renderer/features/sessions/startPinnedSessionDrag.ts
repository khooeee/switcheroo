import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { getSessionDropTarget } from "./getSessionDropTarget";

/** Drag-reorder within the pinned section only. */
export function startPinnedSessionDrag({
  event,
  sessionId,
  pinnedIds,
  scrollRef,
  setDragId,
  setDropBeforeId,
  skipClick,
  onReorder,
}: {
  event: ReactPointerEvent<HTMLButtonElement>;
  sessionId: string;
  pinnedIds: string[];
  scrollRef: RefObject<HTMLDivElement | null>;
  setDragId: (id: string | null) => void;
  setDropBeforeId: (id: string | null | undefined) => void;
  skipClick: { current: string | null };
  onReorder: (sessionIds: string[]) => void;
}): void {
  if (event.button !== 0) return;
  const startY = event.clientY;
  let pointerY = startY;
  let dragging = false;
  let order = pinnedIds;
  const previousCursor = document.body.style.cursor;
  const previousSelect = document.body.style.userSelect;
  const scroll = scrollRef.current;
  const updateTarget = () => {
    if (!dragging || !scroll) return;
    const rows = [...scroll.querySelectorAll<HTMLElement>("[data-pinned-session-id]")].map((row) => ({
      id: row.dataset.pinnedSessionId ?? "",
      top: row.getBoundingClientRect().top,
      height: row.getBoundingClientRect().height,
    }));
    const target = getSessionDropTarget(rows, sessionId, pointerY);
    order = target.order;
    setDropBeforeId(target.beforeId);
  };
  const move = (ev: PointerEvent) => {
    pointerY = ev.clientY;
    if (!dragging && Math.abs(ev.clientY - startY) < 5) return;
    if (!dragging) {
      dragging = true;
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      setDragId(sessionId);
    }
    updateTarget();
  };
  const stop = (ev: PointerEvent) => {
    if (dragging && ev.type === "pointerup") {
      pointerY = ev.clientY;
      updateTarget();
      skipClick.current = sessionId;
      onReorder(order);
    }
    setDragId(null);
    setDropBeforeId(undefined);
    document.body.style.cursor = previousCursor;
    document.body.style.userSelect = previousSelect;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
    scroll?.removeEventListener("scroll", updateTarget);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
  scroll?.addEventListener("scroll", updateTarget);
}
