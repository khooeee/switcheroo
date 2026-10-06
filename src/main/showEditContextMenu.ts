import { BrowserWindow, clipboard, Menu } from "electron";

/** Native Copy (+ optional Copy Code / Copy Message / Find / Turn Details). */
export function showEditContextMenu(
  win: BrowserWindow | null,
  opts: {
    code?: string;
    markdown?: string;
    canCopy?: boolean;
    canFind?: boolean;
    turnDetails?: { turnId: string; eventId: string };
  } = {},
): void {
  if (!win || win.isDestroyed()) return;
  const items: Electron.MenuItemConstructorOptions[] = [
    { role: "copy", enabled: !!opts.canCopy },
  ];
  if (opts.code) {
    items.push({
      label: "Copy Code",
      click: () => void clipboard.writeText(opts.code!),
    });
  }
  if (opts.markdown) {
    items.push({
      label: "Copy Message",
      click: () => void clipboard.writeText(opts.markdown!),
    });
  }
  if (opts.canFind || opts.turnDetails) {
    items.push({ type: "separator" });
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
  Menu.buildFromTemplate(items).popup({ window: win });
}
