import type { PointerEvent as ReactPointerEvent } from "react";
import { applyRightRailWidth, readRightRailWidth } from "./rightRailWidth";

/** Drag the right rail's left edge to resize it; persists the width on release. */
export function startRightRailResize(event: ReactPointerEvent): void {
  event.preventDefault();
  const startX = event.clientX;
  const startWidth = readRightRailWidth();
  const previousCursor = document.body.style.cursor;
  const previousSelect = document.body.style.userSelect;
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  const move = (ev: PointerEvent) => {
    // Dragging the left edge: move left → wider.
    applyRightRailWidth(startWidth + (startX - ev.clientX));
  };
  const stop = (ev: PointerEvent) => {
    applyRightRailWidth(startWidth + (startX - ev.clientX), true);
    document.body.style.cursor = previousCursor;
    document.body.style.userSelect = previousSelect;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
}
