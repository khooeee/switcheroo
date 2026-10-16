import { stat } from "node:fs/promises";
import path from "node:path";
import { runCursor } from "./runCursor";

/** Open a folder as a Cursor workspace (session project cwd). */
export async function openFolderInCursor(folderPath: string): Promise<void> {
  if (typeof folderPath !== "string" || !folderPath.trim() || folderPath.includes("\0")) {
    throw new Error("Invalid folder path.");
  }
  const folder = path.resolve(folderPath.trim());
  const info = await stat(folder).catch(() => null);
  if (!info?.isDirectory()) throw new Error("This folder no longer exists.");
  await runCursor(
    [folder],
    "Cursor could not open the folder. Check that Cursor is installed and try again.",
  );
}
