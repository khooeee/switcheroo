import { BrowserWindow, clipboard, Menu } from "electron";

/** Native Copy (+ optional Copy as Markdown / Find / Turn Details / Fork). */
export function showEditContextMenu(
  win: BrowserWindow | null,
  opts: {
    markdown?: string;
    canCopy?: boolean;
    canFind?: boolean;
    turnDetails?: { turnId: string; eventId: string };
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
  if (opts.canFind) {
    items.push({
      label: "Find in Message",
      click: () => win.webContents.send("find:open-scoped"),
    });
  }
  if (opts.turnDetails) {
    items.push({
      label: "Turn Details",
      click: () => win.webContents.send("turn:details", opts.turnDetails),
    });
  }
  if (opts.fork) {
    if (opts.canFind || opts.turnDetails) items.push({ type: "separator" });
    items.push({
      label: "Fork",
      click: () => win.webContents.send("session:fork-at", opts.fork),
    });
  }
  Menu.buildFromTemplate(items).popup({ window: win });
}
