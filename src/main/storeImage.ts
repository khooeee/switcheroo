import { createHash } from "node:crypto";
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { imagesDir } from "./userDataPaths";

const MAX_BYTES = 20 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

/**
 * Save image bytes under userData/images by content hash and return the file name,
 * or null when the type is unsupported or the write fails. Sync because tool output
 * is emitted synchronously and images are rare; repeat images are written once.
 */
export function storeImage(bytes: Buffer, mimeType: string): string | null {
  const ext = EXTENSIONS[mimeType.toLowerCase()];
  if (!ext || !bytes.byteLength || bytes.byteLength > MAX_BYTES) return null;
  const name = `${createHash("sha256").update(bytes).digest("hex")}.${ext}`;
  const file = path.join(imagesDir(), name);
  try {
    if (!existsSync(file)) {
      mkdirSync(imagesDir(), { recursive: true });
      // Rename into place so a crash never leaves a truncated file under the final name.
      const temp = `${file}.${process.pid}.tmp`;
      writeFileSync(temp, bytes);
      renameSync(temp, file);
    }
    return name;
  } catch (error) {
    console.error("Could not save tool image", error);
    return null;
  }
}
