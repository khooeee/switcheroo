import * as path from "node:path";
import { dialog, type BrowserWindow } from "electron";

/** Native file picker, using project-relative paths inside cwd and absolute paths elsewhere. */
export async function pickSessionFile(win: BrowserWindow | null, cwd: string): Promise<string | null> {
  const options: Electron.OpenDialogOptions = {
    title: "Open File",
    properties: ["openFile"],
    ...(cwd ? { defaultPath: cwd } : {}),
  };
  const result = win && !win.isDestroyed()
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options);
  const file = result.filePaths[0];
  if (result.canceled || !file) return null;
  const relative = cwd ? path.relative(path.resolve(cwd), file) : null;
  const inside = relative !== null && relative !== ".." && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
  return (inside ? relative : file).split(path.sep).join("/");
}
