import { BrowserWindow, Menu } from "electron";

/** Cut / Copy / Paste (+ Undo / Redo / Select All) for the composer textarea. */
export function showComposerContextMenu(
  win: BrowserWindow | null,
  opts: { canCut?: boolean; canCopy?: boolean; canSelectAll?: boolean } = {},
): void {
  if (!win || win.isDestroyed()) return;
  Menu.buildFromTemplate([
    { role: "undo" },
    { role: "redo" },
    { type: "separator" },
    { role: "cut", enabled: !!opts.canCut },
    { role: "copy", enabled: !!opts.canCopy },
    { role: "paste" },
    { type: "separator" },
    { role: "selectAll", enabled: !!opts.canSelectAll },
  ]).popup({ window: win });
}
