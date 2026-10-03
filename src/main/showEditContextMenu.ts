import { BrowserWindow, Menu } from "electron";

/** Native Copy for transcript & turn-details context menus. */
export function showEditContextMenu(win: BrowserWindow | null): void {
  if (!win || win.isDestroyed()) return;
  Menu.buildFromTemplate([{ role: "copy" }]).popup({ window: win });
}
