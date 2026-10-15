import * as fs from "node:fs/promises";
import * as path from "node:path";
import { shell } from "electron";

/** Open a file in the default app, first writing `initial` if it doesn't exist. */
export async function openOrCreateFile(target: string, initial: string): Promise<void> {
  await fs.mkdir(path.dirname(target), { recursive: true });
  try {
    await fs.access(target);
  } catch {
    await fs.writeFile(target, initial, "utf8");
  }
  const error = await shell.openPath(target);
  if (error) throw new Error(error);
}
