import { app, BrowserWindow } from "electron";
import { revealWindow } from "./revealWindow";

/** Keep only one Switcheroo process; focus the existing window on relaunch. */
export function installSingleInstanceLock(
  getWindow: () => BrowserWindow | null,
): boolean {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return false;
  }

  app.on("second-instance", () => {
    const win = getWindow();
    if (win) revealWindow(win);
  });

  return true;
}
