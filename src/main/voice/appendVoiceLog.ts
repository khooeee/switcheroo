import * as fs from "node:fs/promises";
import * as path from "node:path";
import { encodeJsonl } from "../storage/encodeJsonl";
import { localDateStamp } from "../storage/localDateStamp";
import { voiceLogPath } from "../storage/userDataPaths";

type VoiceLogKind = "heard" | "said" | "tool" | "notice" | "error" | "state";

let writes: Promise<void> = Promise.resolve();

/** Append one voice event (what it heard, said, called, announced) to the day's log, in order. */
export function appendVoiceLog(kind: VoiceLogKind, data: Record<string, unknown>): void {
  const at = Date.now();
  const entry = { at, kind, ...data };
  writes = writes
    .then(async () => {
      const file = voiceLogPath(localDateStamp(new Date(at)));
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.appendFile(file, encodeJsonl([entry]));
    })
    .catch((error) => console.error("Could not write the voice log", error));
}
