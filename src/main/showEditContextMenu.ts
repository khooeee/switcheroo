import { BrowserWindow, clipboard, Menu } from "electron";

/** Native Copy (+ optional Copy as Markdown / Find) for transcript & turn-details. */
export function showEditContextMenu(
  win: BrowserWindow | null,
  opts: { markdown?: string; canCopy?: boolean; canFind?: boolean } = {},
): void {
  if (!win || win.isDestroyed()) return;
  const items: Electron.MenuItemConstructorOptions[] = [
    { role: "copy", enabled: !!opts.canCopy },
  ];
  if (opts.markdown) {
    items.push({
      label: "Copy as Markdown",
      click: () => void clipboard.writeText(opts.markdown!),
    });
  }
  if (opts.canFind) {
    items.push({ type: "separator" }, {
      label: "Find in message",
      click: () => win.webContents.send("find:open-scoped"),
    });
  }
  Menu.buildFromTemplate(items).popup({ window: win });
}
