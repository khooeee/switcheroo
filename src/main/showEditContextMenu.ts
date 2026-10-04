import { BrowserWindow, clipboard, Menu } from "electron";

/** Native Copy (+ optional Copy as Markdown / Find / Fork) for transcript & turn-details. */
export function showEditContextMenu(
  win: BrowserWindow | null,
  opts: {
    markdown?: string;
    canCopy?: boolean;
    canFind?: boolean;
    fork?: { sessionId: string; eventId: string };
  } = {},
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
  if (opts.canFind || opts.fork) {
    items.push({ type: "separator" });
  }
  if (opts.canFind) {
    items.push({
      label: "Find in Message",
      click: () => win.webContents.send("find:open-scoped"),
    });
  }
  if (opts.fork) {
    if (opts.canFind) items.push({ type: "separator" });
    items.push({
      label: "Fork",
      click: () => win.webContents.send("session:fork-at", opts.fork),
    });
  }
  Menu.buildFromTemplate(items).popup({ window: win });
}
