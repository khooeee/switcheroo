import { BrowserWindow, clipboard, Menu } from "electron";

/** Native Copy (+ optional Copy as Markdown) for transcript & turn-details. */
export function showEditContextMenu(win: BrowserWindow | null, markdown?: string): void {
  if (!win || win.isDestroyed()) return;
  const items: Electron.MenuItemConstructorOptions[] = [{ role: "copy" }];
  if (markdown) {
    items.push({
      label: "Copy as Markdown",
      click: () => clipboard.writeText(markdown),
    });
  }
  Menu.buildFromTemplate(items).popup({ window: win });
}
