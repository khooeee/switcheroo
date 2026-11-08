import * as fs from "node:fs/promises";
import { shell } from "electron";
import { voiceLogDir } from "../storage/userDataPaths";

/** Reveal the voice log directory in the file manager. */
export async function openVoiceLogFolder(): Promise<void> {
  const dir = voiceLogDir();
  await fs.mkdir(dir, { recursive: true });
  const error = await shell.openPath(dir);
  if (error) throw new Error(error);
}
