import { dialog, type BrowserWindow } from "electron";
import { quitWarningDetail } from "./quitWarningDetail";

/** Ask before quitting over running chats or live terminals; resolves true to go ahead. */
export async function confirmQuit(
  win: BrowserWindow | null,
  counts: { runningChats: number; openTerminals: number },
): Promise<boolean> {
  const detail = quitWarningDetail(counts);
  if (!detail) return true;
  const options: Electron.MessageBoxOptions = {
    type: "warning",
    buttons: ["Quit", "Cancel"],
    defaultId: 0,
    cancelId: 1,
    message: "Quit Switcheroo?",
    detail,
  };
  const { response } = win && !win.isDestroyed()
    ? await dialog.showMessageBox(win, options)
    : await dialog.showMessageBox(options);
  return response === 0;
}
