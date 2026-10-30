import { dialog, type BrowserWindow } from "electron";
import { writeFileAtomic } from "../storage/writeFileAtomic";
import { markdownFileName } from "./markdownFileName";

/** Save-as dialog for markdown; the default name comes from `nameHint` (else `text`). False when cancelled. */
export async function saveMarkdownFile(
  win: BrowserWindow | null,
  text: string,
  nameHint?: string,
): Promise<boolean> {
  const options: Electron.SaveDialogOptions = {
    defaultPath: markdownFileName(nameHint || text),
    filters: [{ name: "Markdown", extensions: ["md"] }],
    properties: ["createDirectory", "showOverwriteConfirmation"],
  };
  const result = win && !win.isDestroyed()
    ? await dialog.showSaveDialog(win, options)
    : await dialog.showSaveDialog(options);
  if (result.canceled || !result.filePath) return false;
  await writeFileAtomic(result.filePath, text.endsWith("\n") ? text : `${text}\n`);
  return true;
}
