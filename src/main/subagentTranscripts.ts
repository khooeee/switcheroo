import * as fs from "node:fs/promises";
import type { TranscriptTurn } from "../shared/transcript";
import { mergeTurnsById } from "../shared/mergeTurnsById";
import { encodeJsonl } from "./encodeJsonl";
import { parseJsonl } from "./parseJsonl";
import { subagentTranscriptPath, subagentsDir } from "./userDataPaths";

const isMissing = (err: unknown) => (err as NodeJS.ErrnoException).code === "ENOENT";

export async function loadSubagentTranscript(
  sessionId: string,
  subagentId: string,
): Promise<TranscriptTurn[]> {
  try {
    const raw = await fs.readFile(subagentTranscriptPath(sessionId, subagentId), "utf8");
    return raw.trim() ? parseJsonl<TranscriptTurn>(raw) : [];
  } catch (err) {
    if (isMissing(err)) return [];
    throw err;
  }
}

/** Merge `turns` into the saved file: memory may hold only turns streamed since launch. */
export async function saveSubagentTranscript(
  sessionId: string,
  subagentId: string,
  turns: TranscriptTurn[],
): Promise<void> {
  const target = subagentTranscriptPath(sessionId, subagentId);
  const saved = await loadSubagentTranscript(sessionId, subagentId);
  const tmp = `${target}.${process.pid}.tmp`;
  await fs.mkdir(subagentsDir(sessionId), { recursive: true });
  await fs.writeFile(tmp, encodeJsonl(mergeTurnsById(saved, turns)), "utf8");
  await fs.rename(tmp, target);
}

/** A fork keeps the parent's subagent rows, so it gets copies of their transcripts. */
export async function copySubagentTranscripts(fromSessionId: string, toSessionId: string): Promise<void> {
  try {
    await fs.cp(subagentsDir(fromSessionId), subagentsDir(toSessionId), { recursive: true });
  } catch (err) {
    if (!isMissing(err)) throw err;
  }
}
