import * as fs from "node:fs/promises";
import { shell } from "electron";
import { dailyLogDir } from "../storage/userDataPaths";

/** Reveal the daily log directory in the file manager. */
export async function openDailyLogFolder(): Promise<void> {
  const dir = dailyLogDir();
  await fs.mkdir(dir, { recursive: true });
  const error = await shell.openPath(dir);
  if (error) throw new Error(error);
}
