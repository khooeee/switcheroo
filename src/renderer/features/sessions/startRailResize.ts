import type { PointerEvent as ReactPointerEvent } from "react";
import { startColumnDrag } from "../layout/startColumnDrag";
import { applyRailWidth, readRailWidth } from "./railWidth";

/** Drag the left rail's right edge to resize it; persists the width on release. */
export function startRailResize(event: ReactPointerEvent): void {
  const startWidth = readRailWidth();
  startColumnDrag(event, (dx, done) => applyRailWidth(startWidth + dx, done));
}
