import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { VoiceLogEntry } from "../../shared/voiceLogEntry";
import { encodeJsonl } from "../storage/encodeJsonl";
import { localDateStamp } from "../storage/localDateStamp";
import { voiceLogPath } from "../storage/userDataPaths";
import { voiceLogFeed } from "./voiceLogFeed";

let writes: Promise<void> = Promise.resolve();

/** Append one voice event (what it heard, said, called, announced) to the day's log, in order, and feed it live. */
export function appendVoiceLog(kind: VoiceLogEntry["kind"], data: Record<string, unknown>): void {
  const at = Date.now();
  const entry: VoiceLogEntry = { at, kind, ...data };
  voiceLogFeed.emit(entry);
  writes = writes
    .then(async () => {
      const file = voiceLogPath(localDateStamp(new Date(at)));
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.appendFile(file, encodeJsonl([entry]));
    })
    .catch((error) => console.error("Could not write the voice log", error));
}
