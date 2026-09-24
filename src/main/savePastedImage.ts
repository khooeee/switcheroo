import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const MAX_BYTES = 20 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

export async function savePastedImage(bytes: Uint8Array, mimeType: string): Promise<string> {
  if (!bytes.byteLength) throw new Error("The pasted image was empty.");
  if (bytes.byteLength > MAX_BYTES) throw new Error("The pasted image is too large.");

  const dir = path.join(tmpdir(), "switcheroo", "pastes");
  await mkdir(dir, { recursive: true });
  const ext = EXTENSIONS[mimeType.toLowerCase()] ?? "png";
  const dest = path.join(dir, `paste-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`);
  await writeFile(dest, bytes);
  return dest;
}
