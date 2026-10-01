/** Max width for one side pane: ≤45% of the window, and leave ≥10% for the main area. */
export function fitSidePaneWidth(
  desired: number,
  otherPaneWidth: number,
  viewportWidth: number,
  minWidth: number,
): number {
  const sideCap = Math.floor(viewportWidth * 0.45);
  const budget = Math.floor(viewportWidth * 0.9) - Math.max(0, Math.round(otherPaneWidth));
  const max = Math.max(minWidth, Math.min(sideCap, budget));
  if (!Number.isFinite(desired)) return max;
  return Math.min(max, Math.max(minWidth, Math.round(desired)));
}
