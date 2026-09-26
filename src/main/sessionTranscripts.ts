import * as fs from "node:fs/promises";
import type { TranscriptItem } from "../shared/types";
import { sessionDir, sessionTranscriptPath } from "./userDataPaths";

let pendingSave: Promise<void> = Promise.resolve();

export async function loadTranscript(sessionId: string): Promise<TranscriptItem[]> {
  try {
    const raw = await fs.readFile(sessionTranscriptPath(sessionId), "utf8");
    if (!raw.trim()) return [];
    return raw
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as TranscriptItem);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function saveTranscript(sessionId: string, items: TranscriptItem[]): Promise<void> {
  const target = sessionTranscriptPath(sessionId);
  const tmp = `${target}.${process.pid}.tmp`;
  const body = items.length ? `${items.map((item) => JSON.stringify(item)).join("\n")}\n` : "";
  const save = pendingSave.then(async () => {
    await fs.mkdir(sessionDir(sessionId), { recursive: true });
    await fs.writeFile(tmp, body, "utf8");
    await fs.rename(tmp, target);
  });
  pendingSave = save.catch(() => undefined);
  await save;
}
