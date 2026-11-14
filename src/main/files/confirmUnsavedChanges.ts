import { dialog, type BrowserWindow } from "electron";
import type { UnsavedChoice } from "../../shared/unsavedChoice";

const CHOICES: UnsavedChoice[] = ["save", "discard", "cancel"];

/** Save / Don't Save / Cancel for files with unsaved edits (names shown as given). */
export async function confirmUnsavedChanges(
  win: BrowserWindow | null,
  names: string[],
): Promise<UnsavedChoice> {
  const options: Electron.MessageBoxOptions = {
    type: "warning",
    buttons: ["Save", "Don't Save", "Cancel"],
    defaultId: 0,
    cancelId: 2,
    message: names.length === 1
      ? `Do you want to save the changes you made to ${names[0]}?`
      : `Do you want to save the changes to ${names.length} files?`,
    detail: `${names.length > 1 ? `${names.join("\n")}\n\n` : ""}Your changes will be lost if you don't save them.`,
  };
  const { response } = win && !win.isDestroyed()
    ? await dialog.showMessageBox(win, options)
    : await dialog.showMessageBox(options);
  return CHOICES[response] ?? "cancel";
}
