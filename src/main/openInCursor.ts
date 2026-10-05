import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";
import { runCursor } from "./runCursor";

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
  await runCursor(
    args,
    "Cursor could not open the file. Check that Cursor is installed and try again.",
  );
}
