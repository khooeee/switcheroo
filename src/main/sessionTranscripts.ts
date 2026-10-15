import type { TranscriptItem, TranscriptTurn } from "../shared/transcript";
import { encodeJsonl } from "./encodeJsonl";
import { readJsonlFile } from "./readJsonlFile";
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
  const turns = await readJsonlFile<TranscriptTurn>(sessionTranscriptPath(sessionId));
  return turns.map(stripTurnQueued);
}

export async function saveTranscript(sessionId: string, turns: TranscriptTurn[]): Promise<void> {
  await writeFileAtomic(sessionTranscriptPath(sessionId), encodeJsonl(turns.map(stripTurnQueued)));
}
