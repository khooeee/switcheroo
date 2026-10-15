import * as fs from "node:fs/promises";
import type { TranscriptItem, TranscriptTurn } from "../shared/transcript";
import { encodeJsonl } from "./encodeJsonl";
import { isMissingFile } from "./isMissingFile";
import { parseJsonl } from "./parseJsonl";
import { sessionTranscriptPath } from "./userDataPaths";
import { writeFileAtomic } from "./writeFileAtomic";

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
    if (isMissingFile(err)) return [];
    throw err;
  }
}

export async function saveTranscript(sessionId: string, turns: TranscriptTurn[]): Promise<void> {
  await writeFileAtomic(sessionTranscriptPath(sessionId), encodeJsonl(turns.map(stripTurnQueued)));
}
