import { BrowserWindow, Menu } from "electron";

/** Native edit ops for transcript & turn-details context menus. */
export function showEditContextMenu(win: BrowserWindow | null): void {
  if (!win || win.isDestroyed()) return;
  Menu.buildFromTemplate([
    { role: "copy" },
    { role: "paste" },
    { type: "separator" },
    { role: "selectAll" },
  ]).popup({ window: win });
}
