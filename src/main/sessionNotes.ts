import * as fs from "node:fs/promises";
import { sessionDir, sessionNotesPath } from "./userDataPaths";

let pendingSave: Promise<void> = Promise.resolve();

export async function loadSessionNotes(sessionId: string): Promise<string> {
  try {
    return await fs.readFile(sessionNotesPath(sessionId), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw err;
  }
}

export async function saveSessionNotes(sessionId: string, notes: string): Promise<void> {
  const target = sessionNotesPath(sessionId);
  const tmp = `${target}.${process.pid}.tmp`;
  const save = pendingSave.then(async () => {
    await fs.mkdir(sessionDir(sessionId), { recursive: true });
    if (!notes) {
      try {
        await fs.unlink(target);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      }
      return;
    }
    await fs.writeFile(tmp, notes, "utf8");
    await fs.rename(tmp, target);
  });
  pendingSave = save.catch(() => undefined);
  await save;
}
