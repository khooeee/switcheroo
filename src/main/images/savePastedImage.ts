import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { imageExtension } from "./imageExtension";
import { MAX_IMAGE_BYTES } from "./maxImageBytes";

export async function savePastedImage(bytes: Uint8Array, mimeType: string): Promise<string> {
  if (!bytes.byteLength) throw new Error("The pasted image was empty.");
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("The pasted image is too large.");

  const dir = path.join(tmpdir(), "switcheroo", "pastes");
  await mkdir(dir, { recursive: true });
  const ext = imageExtension(mimeType) ?? "png";
  const dest = path.join(dir, `paste-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`);
  await writeFile(dest, bytes);
  return dest;
}
