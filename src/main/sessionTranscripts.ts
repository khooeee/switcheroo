import * as fs from "node:fs/promises";
import type { TranscriptItem } from "../shared/types";
import { sessionsDir, sessionTranscriptPath } from "./userDataPaths";

let pendingSave: Promise<void> = Promise.resolve();

export async function loadTranscript(tabId: string): Promise<TranscriptItem[]> {
  try {
    const raw = await fs.readFile(sessionTranscriptPath(tabId), "utf8");
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

export async function saveTranscript(tabId: string, items: TranscriptItem[]): Promise<void> {
  const target = sessionTranscriptPath(tabId);
  const tmp = `${target}.${process.pid}.tmp`;
  const body = items.length ? `${items.map((item) => JSON.stringify(item)).join("\n")}\n` : "";
  const save = pendingSave.then(async () => {
    await fs.mkdir(sessionsDir(), { recursive: true });
    await fs.writeFile(tmp, body, "utf8");
    await fs.rename(tmp, target);
  });
  pendingSave = save.catch(() => undefined);
  await save;
}

export async function deleteTranscript(tabId: string): Promise<void> {
  try {
    await fs.unlink(sessionTranscriptPath(tabId));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

/** Write many transcripts (used when migrating out of switcheroo-state.json). */
export async function saveAllTranscripts(
  transcripts: Record<string, TranscriptItem[]>,
): Promise<void> {
  for (const [tabId, items] of Object.entries(transcripts)) {
    await saveTranscript(tabId, items);
  }
}

/** Remove JSONL files whose tab ids are not in `keep`. */
export async function removeOrphanTranscripts(keep: Set<string>): Promise<void> {
  let names: string[];
  try {
    names = await fs.readdir(sessionsDir());
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
    throw err;
  }
  for (const name of names) {
    if (!name.endsWith(".jsonl")) continue;
    const tabId = name.slice(0, -".jsonl".length);
    if (!keep.has(tabId)) await deleteTranscript(tabId);
  }
}
