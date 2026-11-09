import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { imageExtension } from "./imageExtension";
import { MAX_IMAGE_BYTES } from "./maxImageBytes";

let pastesDir: Promise<string> | null = null;

/**
 * A private (0700), unguessable temp folder for this launch: on Linux tmpdir() is the shared /tmp,
 * where a fixed path could be read or pre-created by other users. Made again if a tmp cleaner removed it.
 */
async function privatePastesDir(): Promise<string> {
  const dir = await pastesDir?.catch(() => null);
  if (dir && existsSync(dir)) return dir;
  pastesDir = mkdtemp(path.join(tmpdir(), "switcheroo-pastes-"));
  return pastesDir;
}

export async function savePastedImage(bytes: Uint8Array, mimeType: string): Promise<string> {
  if (!bytes.byteLength) throw new Error("The pasted image was empty.");
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("The pasted image is too large.");

  const dir = await privatePastesDir();
  const ext = imageExtension(mimeType) ?? "png";
  const dest = path.join(dir, `paste-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`);
  await writeFile(dest, bytes, { mode: 0o600 });
  return dest;
}
