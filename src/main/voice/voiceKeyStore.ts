import * as fs from "node:fs/promises";
import { safeStorage } from "electron";
import type { VoiceKeyInfo } from "../../shared/voiceKeyInfo";
import { isMissingFile } from "../storage/isMissingFile";
import { voiceKeyPath } from "../storage/userDataPaths";
import { writeFileAtomic } from "../storage/writeFileAtomic";

/** Decrypted once per launch so the keychain is not asked on every connect. */
let cached: string | null | undefined;

/** Linux without a keyring falls back to a fixed obfuscation key. */
async function secure(): Promise<boolean> {
  if (!(await safeStorage.isAsyncEncryptionAvailable())) return false;
  return process.platform !== "linux" || safeStorage.getSelectedStorageBackend() !== "basic_text";
}

async function save(key: string): Promise<void> {
  await writeFileAtomic(voiceKeyPath(), (await safeStorage.encryptStringAsync(key)).toString("base64"));
}

/** Inworld API key on disk, encrypted with safeStorage (OS keychain). */
export const voiceKeyStore = {
  async read(): Promise<string | null> {
    if (cached !== undefined) return cached;
    try {
      const body = await fs.readFile(voiceKeyPath(), "utf8");
      const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(Buffer.from(body.trim(), "base64"));
      cached = result || null;
      if (cached && shouldReEncrypt) save(cached).catch(() => console.warn("[voice] could not re-encrypt the Inworld API key"));
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
    if (!(await safeStorage.isAsyncEncryptionAvailable())) throw new Error("OS encryption is unavailable, so the key cannot be stored safely.");
    await save(trimmed);
    cached = trimmed;
  },

  async info(): Promise<VoiceKeyInfo> {
    return { hasKey: !!(await this.read()), secure: await secure() };
  },
};
