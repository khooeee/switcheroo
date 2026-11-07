import { dialog, type BrowserWindow } from "electron";
import { quitWarningDetail } from "./quitWarningDetail";

/** Ask before quitting over running chats; resolves true to go ahead. */
export async function confirmQuit(
  win: BrowserWindow | null,
  runningChats: number,
): Promise<boolean> {
  const detail = quitWarningDetail(runningChats);
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
