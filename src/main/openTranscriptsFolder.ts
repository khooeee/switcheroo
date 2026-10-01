import * as fs from "node:fs/promises";
import { shell } from "electron";
import { sessionsDir } from "./userDataPaths";

/** Reveal the sessions directory in the file manager. */
export async function openTranscriptsFolder(): Promise<void> {
  const dir = sessionsDir();
  await fs.mkdir(dir, { recursive: true });
  const error = await shell.openPath(dir);
  if (error) throw new Error(error);
}
