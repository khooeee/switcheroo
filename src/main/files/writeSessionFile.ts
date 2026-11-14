import * as fs from "node:fs/promises";
import type { FileWriteResult } from "../../shared/fileWriteResult";
import { resolveEditorFile } from "./resolveEditorFile";

/**
 * Save editor text to a file. With `baseMtimeMs`, refuse when the file
 * changed since it was loaded; null overwrites. Writes in place so permissions and links stay.
 */
export async function writeSessionFile(
  cwd: string,
  relPath: string,
  text: string,
  baseMtimeMs: number | null,
): Promise<FileWriteResult> {
  const file = resolveEditorFile(cwd, relPath);
  if (baseMtimeMs !== null) {
    const current = await fs.stat(file).catch(() => null);
    if (current && current.mtimeMs !== baseMtimeMs) {
      return { ok: false, conflict: true, mtimeMs: current.mtimeMs };
    }
  }
  await fs.writeFile(file, text, "utf8");
  return { ok: true, mtimeMs: (await fs.stat(file)).mtimeMs };
}
