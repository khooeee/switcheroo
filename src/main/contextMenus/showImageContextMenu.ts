import { BrowserWindow, Menu } from "electron";
import { saveImageFile } from "../images/saveImageFile";

/** Native Save Image menu for a transcript image. */
export function showImageContextMenu(win: BrowserWindow | null, name: string): void {
  if (!win || win.isDestroyed()) return;
  Menu.buildFromTemplate([
    { label: "Save Image…", click: () => void saveImageFile(win, name).catch(console.error) },
  ]).popup({ window: win });
}
