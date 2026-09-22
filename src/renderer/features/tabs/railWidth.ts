const STORAGE_KEY = "switcheroo.railWidth";
/** Sora 12px "Switchboard", tab padding and border, row padding, gap, and the add button. */
const MIN_WIDTH = 160;
const MAX_WIDTH = 320;
const DEFAULT_WIDTH = 160;

function clampWidth(width: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width)));
}

export function readRailWidth(): number {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(value)) return clampWidth(value);
  } catch {
    // Storage can be unavailable; use the default width.
  }
  return DEFAULT_WIDTH;
}

export function applyRailWidth(width: number, persist = false): number {
  const next = clampWidth(width);
  document.documentElement.style.setProperty("--rail", `${next}px`);
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // The width still applies for this session if storage is unavailable.
    }
  }
  return next;
}
