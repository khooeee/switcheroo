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

/**
 * Run the Cursor CLI, trying each known install location. A failing command does not stop the
 * search: `~/.local/bin/cursor` is the Cursor Agent shim, which exits 1 under the minimal PATH
 * a Finder-launched app gets.
 */
export async function runCursor(args: string[], failMessage: string): Promise<void> {
  let found = false;
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
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") found = true;
    }
  }
  throw new Error(
    found ? failMessage : "Cursor was not found. Install Cursor or enable its 'cursor' shell command.",
  );
}
