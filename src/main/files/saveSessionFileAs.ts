import { dialog, type BrowserWindow } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { SavedFile } from "../../shared/savedFile";
import { resolveInsideCwd } from "./resolveInsideCwd";

/** `file` relative to `root` and "/"-separated, or null when it lies outside. */
function relativeInside(root: string, file: string): string | null {
  const rel = path.relative(root, file);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join("/");
}

/**
 * Save As for the editor: ask where (starting at `suggested`, relative to the session cwd) and
 * write `text` there. Only inside the project folder, where the explorer can show the file;
 * a place outside asks again. Null when cancelled.
 */
export async function saveSessionFileAs(
  win: BrowserWindow | null,
  cwd: string,
  suggested: string,
  text: string,
): Promise<SavedFile | null> {
  const root = path.resolve(cwd);
  // The dialog can answer with the real path of a symlinked project folder.
  const realRoot = await fs.realpath(root);
  const owner = win && !win.isDestroyed() ? win : null;
  let defaultPath = resolveInsideCwd(cwd, suggested);
  for (;;) {
    const options: Electron.SaveDialogOptions = {
      defaultPath,
      properties: ["createDirectory", "showOverwriteConfirmation"],
    };
    const result = owner ? await dialog.showSaveDialog(owner, options) : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) return null;
    const file = result.filePath;
    const relPath = relativeInside(root, file) ?? relativeInside(realRoot, file);
    if (relPath !== null) {
      await fs.writeFile(file, text, "utf8");
      return { path: relPath, mtimeMs: (await fs.stat(file)).mtimeMs };
    }
    const warning: Electron.MessageBoxOptions = {
      type: "warning",
      message: "Save inside the project folder",
      detail: `Files in this session are saved under ${root}.`,
    };
    await (owner ? dialog.showMessageBox(owner, warning) : dialog.showMessageBox(warning));
    defaultPath = path.join(root, path.basename(file));
  }
}
