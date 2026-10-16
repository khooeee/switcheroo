import * as fs from "node:fs/promises";
import type { TranscriptTurn } from "../../shared/transcript";
import { mergeTurnsById } from "../../shared/mergeTurnsById";
import { encodeJsonl } from "./encodeJsonl";
import { isMissingFile } from "./isMissingFile";
import { readJsonlFile } from "./readJsonlFile";
import { subagentTranscriptPath, subagentsDir } from "./userDataPaths";
import { writeFileAtomic } from "./writeFileAtomic";

export function loadSubagentTranscript(
  sessionId: string,
  subagentId: string,
): Promise<TranscriptTurn[]> {
  return readJsonlFile<TranscriptTurn>(subagentTranscriptPath(sessionId, subagentId));
}

/** Merge `turns` into the saved file: memory may hold only turns streamed since launch. */
export async function saveSubagentTranscript(
  sessionId: string,
  subagentId: string,
  turns: TranscriptTurn[],
): Promise<void> {
  const saved = await loadSubagentTranscript(sessionId, subagentId);
  await writeFileAtomic(subagentTranscriptPath(sessionId, subagentId), encodeJsonl(mergeTurnsById(saved, turns)));
}

/** A fork keeps the parent's subagent rows, so it gets copies of their transcripts. */
export async function copySubagentTranscripts(fromSessionId: string, toSessionId: string): Promise<void> {
  try {
    await fs.cp(subagentsDir(fromSessionId), subagentsDir(toSessionId), { recursive: true });
  } catch (err) {
    if (!isMissingFile(err)) throw err;
  }
}
