import type { BrowserWindow } from "electron";

/** Bring the window to the front, restoring it if minimized. */
export function revealWindow(win: BrowserWindow): void {
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}
