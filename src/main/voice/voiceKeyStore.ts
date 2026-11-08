import * as fs from "node:fs/promises";
import { safeStorage } from "electron";
import type { VoiceKeyInfo } from "../../shared/voiceKeyInfo";
import { isMissingFile } from "../storage/isMissingFile";
import { voiceKeyPath } from "../storage/userDataPaths";
import { writeFileAtomic } from "../storage/writeFileAtomic";

/** Decrypted once per launch so the keychain is not asked on every connect. */
let cached: string | null | undefined;

/** Linux without a keyring falls back to a fixed obfuscation key. */
function secure(): boolean {
  if (!safeStorage.isEncryptionAvailable()) return false;
  return process.platform !== "linux" || safeStorage.getSelectedStorageBackend() !== "basic_text";
}

/** Inworld API key on disk, encrypted with safeStorage (OS keychain). */
export const voiceKeyStore = {
  async read(): Promise<string | null> {
    if (cached !== undefined) return cached;
    try {
      const body = await fs.readFile(voiceKeyPath(), "utf8");
      cached = safeStorage.decryptString(Buffer.from(body.trim(), "base64")) || null;
    } catch (error) {
      if (!isMissingFile(error)) console.warn("[voice] could not read the Inworld API key");
      cached = null;
    }
    return cached;
  },

  /** Save `key`; an empty key deletes it. Accepts a pasted `Basic <key>` header too. */
  async write(key: string): Promise<void> {
    const trimmed = key.trim().replace(/^basic\s+/i, "");
    if (!trimmed) {
      await fs.rm(voiceKeyPath(), { force: true });
      cached = null;
      return;
    }
    if (!safeStorage.isEncryptionAvailable()) throw new Error("OS encryption is unavailable, so the key cannot be stored safely.");
    await writeFileAtomic(voiceKeyPath(), safeStorage.encryptString(trimmed).toString("base64"));
    cached = trimmed;
  },

  async info(): Promise<VoiceKeyInfo> {
    return { hasKey: !!(await this.read()), secure: secure() };
  },
};
