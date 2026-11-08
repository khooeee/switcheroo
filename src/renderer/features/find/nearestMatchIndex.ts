import { rangeScroller } from "./rangeScroller";

type Side = "above" | "visible" | "below";

/**
 * Starting match for a new query: keep the current match (or the next one
 * after it) while it's on screen, else the first visible match, else the
 * first below the viewport, else the nearest above it.
 */
export function nearestMatchIndex(ranges: Range[], previous: Range | null): number {
  const sides = ranges.map(viewportSide);
  if (previous && viewportSide(previous) === "visible") {
    const kept = ranges.findIndex((range, i) =>
      sides[i] === "visible" &&
      range.compareBoundaryPoints(Range.START_TO_START, previous) >= 0);
    if (kept >= 0) return kept;
  }
  const visible = sides.indexOf("visible");
  if (visible >= 0) return visible;
  const below = sides.indexOf("below");
  if (below >= 0) return below;
  return Math.max(0, sides.lastIndexOf("above"));
}

function viewportSide(range: Range): Side {
  const rect = range.getBoundingClientRect();
  const scroller = rangeScroller(range);
  const viewport = scroller?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight };
  if (rect.bottom <= viewport.top) return "above";
  if (rect.top >= viewport.bottom) return "below";
  return "visible";
}
