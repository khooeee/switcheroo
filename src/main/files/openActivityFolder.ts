import * as fs from "node:fs/promises";
import { shell } from "electron";
import { activityDir } from "../storage/userDataPaths";

/** Reveal the activity log directory in the file manager. */
export async function openActivityFolder(): Promise<void> {
  const dir = activityDir();
  await fs.mkdir(dir, { recursive: true });
  const error = await shell.openPath(dir);
  if (error) throw new Error(error);
}
