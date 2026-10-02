import { getAppSettingsCache, patchAppSettings } from "../settings/appSettingsCache";
import { fitSidePaneWidth } from "../layout/fitSidePaneWidth";
import { readCssPx } from "../layout/readCssPx";

/** Sora 12px "Switchboard", session padding and border, row padding, gap, and the add button. */
const MIN_WIDTH = 160;
const DEFAULT_WIDTH = 160;

function viewportWidth(explicit?: number): number {
  if (Number.isFinite(explicit)) return explicit as number;
  return typeof window !== "undefined" ? window.innerWidth : 1440;
}

export function maxRailWidth(viewport = viewportWidth()): number {
  return fitSidePaneWidth(Number.POSITIVE_INFINITY, readCssPx("--right-rail"), viewport, MIN_WIDTH);
}

function clampWidth(width: number, viewport?: number): number {
  return fitSidePaneWidth(width, readCssPx("--right-rail"), viewportWidth(viewport), MIN_WIDTH);
}

export function readRailWidth(): number {
  const value = getAppSettingsCache().railWidth;
  return Number.isFinite(value) ? clampWidth(value) : DEFAULT_WIDTH;
}

export function applyRailWidth(width: number, persist = false): number {
  const next = clampWidth(width);
  document.documentElement.style.setProperty("--rail", `${next}px`);
  if (persist) void patchAppSettings({ railWidth: next });
  return next;
}

/** Re-apply the stored rail width against the current window (no persist). */
export function reclampRailWidth(): number {
  return applyRailWidth(getAppSettingsCache().railWidth, false);
}
