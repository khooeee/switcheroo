import { getAppSettingsCache, patchAppSettings } from "../settings/appSettingsCache";
import { fitSidePaneWidth } from "../layout/fitSidePaneWidth";
import { readCssPx } from "../layout/readCssPx";
import { reclampRailWidth } from "../sessions/reclampRailWidth";

const MIN_WIDTH = 240;
const DEFAULT_WIDTH = 320;

/** Width each tab's rail opened at or was resized to; this app run only. */
const tabWidths = new Map<string, number>();
/** Tab whose rail is on screen; null while hidden. */
let shownTabId: string | null = null;

function clampWidth(width: number): number {
  return fitSidePaneWidth(width, readCssPx("--rail"), window.innerWidth, MIN_WIDTH);
}

function setCssWidth(px: number): void {
  document.documentElement.style.setProperty("--right-rail", `${px}px`);
  reclampRailWidth();
}

/** The shown tab's width (or the stored default), fitted to the window. */
function read(): number {
  const value = (shownTabId ? tabWidths.get(shownTabId) : undefined) ?? getAppSettingsCache().rightRailWidth;
  return Number.isFinite(value) ? clampWidth(value) : DEFAULT_WIDTH;
}

/** Apply width to `--right-rail`. Pass `persist` on drag end: it sticks to this tab and becomes the default for new ones. */
function apply(width: number, persist = false): number {
  const next = clampWidth(width);
  setCssWidth(next);
  if (persist) {
    if (shownTabId) tabWidths.set(shownTabId, next);
    void patchAppSettings({ rightRailWidth: next });
  }
  return next;
}

/** Show `tabId`'s rail at its own width. */
function show(tabId: string): number {
  shownTabId = tabId;
  // Take the default now, so resizing another tab's rail later leaves this one alone.
  if (!tabWidths.has(tabId)) tabWidths.set(tabId, getAppSettingsCache().rightRailWidth);
  return apply(read());
}

/** Hide the rail; every tab keeps its width for the next `show`. */
function hide(): void {
  shownTabId = null;
  setCssWidth(0);
}

export const rightRailWidth = { read, apply, show, hide };
