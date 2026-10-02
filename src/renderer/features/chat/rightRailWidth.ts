import { getAppSettingsCache, patchAppSettings } from "../settings/appSettingsCache";
import { fitSidePaneWidth } from "../layout/fitSidePaneWidth";
import { readCssPx } from "../layout/readCssPx";
import { reclampRailWidth } from "../sessions/railWidth";

const MIN_WIDTH = 240;
const DEFAULT_WIDTH = 320;

function viewportWidth(explicit?: number): number {
  if (Number.isFinite(explicit)) return explicit as number;
  return typeof window !== "undefined" ? window.innerWidth : 1440;
}

function clampWidth(width: number, viewport?: number): number {
  return fitSidePaneWidth(width, readCssPx("--rail"), viewportWidth(viewport), MIN_WIDTH);
}

export function readRightRailWidth(): number {
  const value = getAppSettingsCache().rightRailWidth;
  return Number.isFinite(value) ? clampWidth(value) : DEFAULT_WIDTH;
}

/** Apply width to `--right-rail`. Pass `persist` on drag end. Use 0 to hide without changing settings. */
export function applyRightRailWidth(width: number, persist = false): number {
  if (width <= 0) {
    document.documentElement.style.setProperty("--right-rail", "0px");
    reclampRailWidth();
    return 0;
  }
  const next = clampWidth(width);
  document.documentElement.style.setProperty("--right-rail", `${next}px`);
  if (persist) void patchAppSettings({ rightRailWidth: next });
  reclampRailWidth();
  return next;
}

/** Show the right rail at the stored width (no persist). */
export function showRightRail(): number {
  return applyRightRailWidth(readRightRailWidth(), false);
}

/** Hide the right rail without clearing the stored width. */
export function hideRightRail(): void {
  applyRightRailWidth(0, false);
}

/** Re-apply the stored right rail width against the current window when visible. */
export function reclampRightRailWidth(): number {
  if (readCssPx("--right-rail") <= 0) return 0;
  return applyRightRailWidth(getAppSettingsCache().rightRailWidth, false);
}
