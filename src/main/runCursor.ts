import { execFile } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";

const CURSOR_COMMANDS = [
  "cursor",
  path.join(homedir(), ".local/bin/cursor"),
  "/usr/local/bin/cursor",
  "/opt/homebrew/bin/cursor",
  ...(process.platform === "darwin"
    ? [
        "/Applications/Cursor.app/Contents/Resources/app/bin/cursor",
        path.join(homedir(), "Applications/Cursor.app/Contents/Resources/app/bin/cursor"),
      ]
    : []),
];

/** Run the Cursor CLI, trying each known install location. */
export async function runCursor(args: string[], failMessage: string): Promise<void> {
  for (const command of CURSOR_COMMANDS) {
    try {
      await new Promise<void>((resolve, reject) => {
        execFile(command, args, { timeout: 15000, windowsHide: true }, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw new Error(failMessage);
    }
  }
  throw new Error("Cursor was not found. Install Cursor or enable its 'cursor' shell command.");
}
