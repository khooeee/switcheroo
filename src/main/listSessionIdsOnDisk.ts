import * as fs from "node:fs/promises";
import { sessionsDir } from "./userDataPaths";

/** Session folder names under userData/sessions, newest id first (YYYY-MM-DD-… sorts). */
export async function listSessionIdsOnDisk(): Promise<string[]> {
  try {
    const entries = await fs.readdir(sessionsDir(), { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .reverse();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}
