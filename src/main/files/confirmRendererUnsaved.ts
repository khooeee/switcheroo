import { ipcMain, type BrowserWindow } from "electron";

/** Give up waiting on a renderer that never answers, so quitting is never stuck. */
const TIMEOUT_MS = 5 * 60 * 1000;
let nextRequestId = 0;

/**
 * Ask the renderer to settle files with unsaved edits (it shows Save / Don't Save / Cancel).
 * Resolves true to go on quitting.
 */
export function confirmRendererUnsaved(win: BrowserWindow | null): Promise<boolean> {
  if (!win || win.isDestroyed() || win.webContents.isCrashed()) return Promise.resolve(true);
  const requestId = ++nextRequestId;
  const contents = win.webContents;
  return new Promise((resolve) => {
    const finish = (ok: boolean) => {
      clearTimeout(timer);
      ipcMain.removeListener("app:quitReady", onReady);
      contents.removeListener("render-process-gone", onGone);
      resolve(ok);
    };
    const onReady = (_event: Electron.IpcMainEvent, id: number, ok: boolean) => {
      if (id === requestId) finish(ok === true);
    };
    const onGone = () => finish(true);
    const timer = setTimeout(() => finish(true), TIMEOUT_MS);
    ipcMain.on("app:quitReady", onReady);
    contents.once("render-process-gone", onGone);
    contents.send("app:prepareQuit", { requestId });
  });
}
