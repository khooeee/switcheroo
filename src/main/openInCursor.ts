import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export async function openInCursor(cwd: string, filePath: string): Promise<void> {
  if (typeof filePath !== "string" || !filePath.trim() || filePath.includes("\0")) {
    throw new Error("Invalid file path.");
  }
  const folder = path.resolve(cwd);
  const file = path.resolve(folder, filePath);
  const relative = path.relative(folder, file);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("This file is outside the agent's project folder.");
  }
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) throw new Error("This file no longer exists or has not been created yet.");

  const commands = [
    "cursor",
    path.join(homedir(), ".local/bin/cursor"),
    "/usr/local/bin/cursor",
    "/opt/homebrew/bin/cursor",
    ...(process.platform === "darwin" ? [
      "/Applications/Cursor.app/Contents/Resources/app/bin/cursor",
      path.join(homedir(), "Applications/Cursor.app/Contents/Resources/app/bin/cursor"),
    ] : []),
  ];
  for (const command of commands) {
    try {
      await new Promise<void>((resolve, reject) => {
        execFile(command, [folder, "--goto", file], { timeout: 15000, windowsHide: true }, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw new Error("Cursor could not open the file. Check that Cursor is installed and try again.");
    }
  }
  throw new Error("Cursor was not found. Install Cursor or enable its 'cursor' shell command.");
}
