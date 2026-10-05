import type { PointerEvent as ReactPointerEvent } from "react";
import { applyRailWidth, readRailWidth } from "./railWidth";

/** Left-rail width drag: pointer down → live resize → persist on up. */
export function useRailColumnResize() {
  return (event: ReactPointerEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = readRailWidth();
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const move = (ev: PointerEvent) => {
      applyRailWidth(startWidth + ev.clientX - startX);
    };
    const stop = (ev: PointerEvent) => {
      applyRailWidth(startWidth + ev.clientX - startX, true);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };
}
