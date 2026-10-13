import type { PointerEvent as ReactPointerEvent } from "react";
import { rightRailWidth } from "./rightRailWidth";

/** Drag the right rail's left edge to resize it; keeps the width for this tab (and as the default) on release. */
export function startRightRailResize(event: ReactPointerEvent): void {
  event.preventDefault();
  const startX = event.clientX;
  const startWidth = rightRailWidth.read();
  const previousCursor = document.body.style.cursor;
  const previousSelect = document.body.style.userSelect;
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  const move = (ev: PointerEvent) => {
    // Dragging the left edge: move left → wider.
    rightRailWidth.apply(startWidth + (startX - ev.clientX));
  };
  const stop = (ev: PointerEvent) => {
    rightRailWidth.apply(startWidth + (startX - ev.clientX), true);
    document.body.style.cursor = previousCursor;
    document.body.style.userSelect = previousSelect;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
}
