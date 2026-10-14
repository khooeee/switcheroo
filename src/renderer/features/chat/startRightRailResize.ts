import type { PointerEvent as ReactPointerEvent } from "react";
import { startColumnDrag } from "../layout/startColumnDrag";
import { rightRailWidth } from "./rightRailWidth";

/** Drag the right rail's left edge to resize it; keeps the width for this tab (and as the default) on release. */
export function startRightRailResize(event: ReactPointerEvent): void {
  const startWidth = rightRailWidth.read();
  // Dragging the left edge: move left → wider.
  startColumnDrag(event, (dx, done) => rightRailWidth.apply(startWidth - dx, done));
}
