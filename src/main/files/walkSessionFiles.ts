import * as fs from "node:fs/promises";
import * as path from "node:path";

const SKIPPED = new Set([".git", ".DS_Store", "node_modules"]);
const MAX_FILES = 50_000;

/**
 * Files under `root` (relative, "/"-separated), breadth first so a cap keeps the shallow ones.
 * Skips VCS and dependency folders and does not follow symlinks, so loops cannot happen.
 */
export async function walkSessionFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  let dirs = [""];
  while (dirs.length > 0 && files.length < MAX_FILES) {
    const next: string[] = [];
    for (const dir of dirs) {
      if (files.length >= MAX_FILES) break;
      const entries = await fs.readdir(path.join(root, dir), { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (SKIPPED.has(entry.name)) continue;
        const rel = dir ? `${dir}/${entry.name}` : entry.name;
        if (entry.isDirectory()) next.push(rel);
        else if (entry.isFile()) files.push(rel);
      }
    }
    dirs = next;
  }
  return files.slice(0, MAX_FILES);
}
