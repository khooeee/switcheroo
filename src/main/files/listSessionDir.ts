import type { Dirent } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { DirEntry } from "../../shared/dirEntry";
import { resolveInsideCwd } from "./resolveInsideCwd";

const HIDDEN = new Set([".git", ".DS_Store"]);

const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

async function entryKind(dir: string, entry: Dirent): Promise<DirEntry["kind"] | null> {
  if (entry.isDirectory()) return "dir";
  if (entry.isFile()) return "file";
  if (!entry.isSymbolicLink()) return null;
  const stat = await fs.stat(path.join(dir, entry.name)).catch(() => null);
  if (!stat) return null;
  return stat.isDirectory() ? "dir" : "file";
}

/** Children of one folder under the session cwd: folders first, then files, natural name order. */
export async function listSessionDir(cwd: string, relPath: string): Promise<DirEntry[]> {
  const dir = resolveInsideCwd(cwd, relPath);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const listed = await Promise.all(
    entries
      .filter((entry) => !HIDDEN.has(entry.name))
      .map(async (entry) => {
        const kind = await entryKind(dir, entry);
        return kind ? { name: entry.name, kind } : null;
      }),
  );
  return listed
    .filter((entry): entry is DirEntry => entry !== null)
    .sort((a, b) => (a.kind === b.kind ? byName.compare(a.name, b.name) : a.kind === "dir" ? -1 : 1));
}
