import * as fs from "node:fs/promises";
import * as path from "node:path";
import { isMissingFile } from "../storage/isMissingFile";

function isInside(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/** Real path of `target`, or of its nearest existing parent joined with the missing rest. */
async function realOrParent(target: string): Promise<string> {
  try {
    return await fs.realpath(target);
  } catch (err) {
    if (!isMissingFile(err)) throw err;
    const parent = path.dirname(target);
    if (parent === target) return target;
    return path.join(await realOrParent(parent), path.basename(target));
  }
}

/**
 * Absolute path for `relPath` ("" is the root) inside a session's cwd.
 * Rejects `..` escapes and symlinks that lead outside the folder.
 */
export async function resolveInsideCwd(cwd: string, relPath: string): Promise<string> {
  if (!cwd) throw new Error("This session has no project folder.");
  const root = path.resolve(cwd);
  const target = path.resolve(root, relPath);
  if (!isInside(root, target)) throw new Error(`${relPath} is outside the project folder.`);
  const realRoot = await fs.realpath(root);
  if (!isInside(realRoot, await realOrParent(target))) {
    throw new Error(`${relPath} links outside the project folder.`);
  }
  return target;
}
