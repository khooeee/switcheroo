import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { FileContent } from "../../shared/fileContent";
import { MAX_IMAGE_BYTES } from "../images/maxImageBytes";
import { isMissingFile } from "../storage/isMissingFile";
import { resolveInsideCwd } from "./resolveInsideCwd";

/** Largest text file the editor opens. */
const MAX_TEXT_BYTES = 2 * 1024 * 1024;

const IMAGE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

/** A NUL byte in the first 8 KB means binary, as git decides. */
function looksBinary(bytes: Buffer): boolean {
  return bytes.subarray(0, 8000).includes(0);
}

/** Read a file under the session cwd as text, an image, or a reason it cannot be shown. */
export async function readSessionFile(cwd: string, relPath: string): Promise<FileContent> {
  const file = await resolveInsideCwd(cwd, relPath);
  const stat = await fs.stat(file).catch((err: unknown) => {
    if (isMissingFile(err)) return null;
    throw err;
  });
  if (!stat || !stat.isFile()) return { kind: "missing" };
  const mimeType = IMAGE_TYPES[path.extname(file).toLowerCase()];
  if (mimeType) {
    if (stat.size > MAX_IMAGE_BYTES) return { kind: "tooLarge", size: stat.size };
    const bytes = await fs.readFile(file);
    return { kind: "image", dataUrl: `data:${mimeType};base64,${bytes.toString("base64")}`, mtimeMs: stat.mtimeMs };
  }
  if (stat.size > MAX_TEXT_BYTES) return { kind: "tooLarge", size: stat.size };
  const bytes = await fs.readFile(file);
  if (looksBinary(bytes)) return { kind: "binary", size: stat.size };
  return { kind: "text", text: bytes.toString("utf8"), mtimeMs: stat.mtimeMs };
}
