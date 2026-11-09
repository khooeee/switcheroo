import { BrowserWindow, Menu } from "electron";
import { standupPrompt } from "../dailyLog/standupPrompt";

/** Cut / Copy / Paste / Paste Standup Prompt (+ Undo / Redo / Select All) for the composer textarea. */
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
    {
      label: "Paste Standup Prompt",
      click: () => win.webContents.send("prompt:paste-standup", standupPrompt()),
    },
    { type: "separator" },
    { role: "selectAll", enabled: !!opts.canSelectAll },
  ]).popup({ window: win });
}
