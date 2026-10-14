import type { PointerEvent as ReactPointerEvent } from "react";

/**
 * Horizontal column-resize drag: shows a col-resize cursor and blocks text selection
 * while dragging. `onDrag` gets the pointer's x offset from the start, with `done` set on release.
 */
export function startColumnDrag(
  event: ReactPointerEvent,
  onDrag: (dx: number, done: boolean) => void,
): void {
  event.preventDefault();
  const startX = event.clientX;
  const previousCursor = document.body.style.cursor;
  const previousSelect = document.body.style.userSelect;
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  const move = (ev: PointerEvent) => {
    onDrag(ev.clientX - startX, false);
  };
  const stop = (ev: PointerEvent) => {
    onDrag(ev.clientX - startX, true);
    document.body.style.cursor = previousCursor;
    document.body.style.userSelect = previousSelect;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
}
