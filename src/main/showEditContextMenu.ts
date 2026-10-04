import { BrowserWindow, clipboard, Menu } from "electron";

/** Native Copy (+ optional Copy as Markdown) for transcript & turn-details. */
export function showEditContextMenu(
  win: BrowserWindow | null,
  opts: { markdown?: string; canCopy?: boolean } = {},
): void {
  if (!win || win.isDestroyed()) return;
  const items: Electron.MenuItemConstructorOptions[] = [
    { role: "copy", enabled: !!opts.canCopy },
  ];
  if (opts.markdown) {
    items.push({
      label: "Copy as Markdown",
      click: () => clipboard.writeText(opts.markdown!),
    });
  }
  Menu.buildFromTemplate(items).popup({ window: win });
}
