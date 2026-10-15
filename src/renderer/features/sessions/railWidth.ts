import { getAppSettingsCache, patchAppSettings } from "../settings/appSettingsCache";
import { fitSidePaneWidth } from "../layout/fitSidePaneWidth";
import { readCssPx } from "../layout/readCssPx";

/** Sora 12px "Switchboard", session padding and border, row padding, gap, and the add button. */
const MIN_WIDTH = 160;
const DEFAULT_WIDTH = 160;

function clampWidth(width: number): number {
  return fitSidePaneWidth(width, readCssPx("--right-rail"), window.innerWidth, MIN_WIDTH);
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
