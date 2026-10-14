import type { PointerEvent as ReactPointerEvent } from "react";
import { startColumnDrag } from "../layout/startColumnDrag";
import { applyRailWidth, readRailWidth } from "./railWidth";

/** Left-rail width drag: pointer down → live resize → persist on up. */
export function useRailColumnResize() {
  return (event: ReactPointerEvent) => {
    const startWidth = readRailWidth();
    startColumnDrag(event, (dx, done) => applyRailWidth(startWidth + dx, done));
  };
}
