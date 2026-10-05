import * as fs from "node:fs/promises";
import type { TranscriptItem, TranscriptTurn } from "../shared/transcript";
import { encodeJsonl } from "./encodeJsonl";
import { parseJsonl } from "./parseJsonl";
import { sessionDir, sessionTranscriptPath } from "./userDataPaths";

let pendingSave: Promise<void> = Promise.resolve();

function stripQueued(item: TranscriptItem): TranscriptItem {
  const { queued: _queued, ...rest } = item;
  return rest;
}

function stripTurnQueued(turn: TranscriptTurn): TranscriptTurn {
  return {
    ...turn,
    user: stripQueued(turn.user),
    assistant: turn.assistant ? stripQueued(turn.assistant) : null,
    events: turn.events.map(stripQueued),
  };
}

export async function loadTranscript(sessionId: string): Promise<TranscriptTurn[]> {
  try {
    const raw = await fs.readFile(sessionTranscriptPath(sessionId), "utf8");
    if (!raw.trim()) return [];
    return parseJsonl<TranscriptTurn>(raw).map(stripTurnQueued);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function saveTranscript(sessionId: string, turns: TranscriptTurn[]): Promise<void> {
  const target = sessionTranscriptPath(sessionId);
  const tmp = `${target}.${process.pid}.tmp`;
  const body = encodeJsonl(turns.map(stripTurnQueued));
  const save = pendingSave.then(async () => {
    await fs.mkdir(sessionDir(sessionId), { recursive: true });
    await fs.writeFile(tmp, body, "utf8");
    await fs.rename(tmp, target);
  });
  pendingSave = save.catch(() => undefined);
  await save;
}
