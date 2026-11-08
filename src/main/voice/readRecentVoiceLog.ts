import * as fs from "node:fs/promises";
import type { VoiceLogEntry } from "../../shared/voiceLogEntry";
import { isMissingFile } from "../storage/isMissingFile";
import { readJsonlFile } from "../storage/readJsonlFile";
import { voiceLogDir, voiceLogPath } from "../storage/userDataPaths";

const DAY_FILE = /^(\d{4}-\d{2}-\d{2})\.jsonl$/;

/** The newest `limit` voice log entries, oldest first, reading back across days as needed. */
export async function readRecentVoiceLog(limit: number): Promise<VoiceLogEntry[]> {
  let names: string[];
  try {
    names = await fs.readdir(voiceLogDir());
  } catch (err) {
    if (isMissingFile(err)) return [];
    throw err;
  }
  const days = names
    .map((name) => DAY_FILE.exec(name)?.[1])
    .filter((day): day is string => !!day)
    .sort()
    .reverse();
  let entries: VoiceLogEntry[] = [];
  for (const day of days) {
    entries = [...(await readJsonlFile<VoiceLogEntry>(voiceLogPath(day))), ...entries];
    if (entries.length >= limit) break;
  }
  return entries.slice(-limit);
}
