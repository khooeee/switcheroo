import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

function isInside(folder: string, file: string): boolean {
  const relative = path.relative(folder, file);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function gitToplevel(directory: string): Promise<string | null> {
  try {
    const stdout = await new Promise<string>((resolve, reject) => {
      execFile(
        "git",
        ["-C", directory, "rev-parse", "--show-toplevel"],
        { timeout: 5000, windowsHide: true },
        (error, out) => (error ? reject(error) : resolve(String(out).trim())),
      );
    });
    return stdout || null;
  } catch {
    return null;
  }
}

async function workspaceFor(cwd: string, file: string): Promise<string | null> {
  const folder = path.resolve(cwd);
  if (isInside(folder, file)) return folder;
  const toplevel = await gitToplevel(path.dirname(file));
  if (toplevel && isInside(toplevel, file)) return toplevel;
  return null;
}

export async function openInCursor(cwd: string, filePath: string): Promise<void> {
  if (typeof filePath !== "string" || !filePath.trim() || filePath.includes("\0")) {
    throw new Error("Invalid file path.");
  }
  const file = path.resolve(path.resolve(cwd), filePath);
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) throw new Error("This file no longer exists or has not been created yet.");

  const workspace = await workspaceFor(cwd, file);
  const args = workspace ? [workspace, "--goto", file] : ["--goto", file];
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
        execFile(command, args, { timeout: 15000, windowsHide: true }, (error) => {
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
