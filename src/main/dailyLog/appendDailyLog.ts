import * as fs from "node:fs/promises";
import * as path from "node:path";
import { encodeJsonl } from "../storage/encodeJsonl";
import { localDateStamp } from "../storage/localDateStamp";
import { dailyLogPath } from "../storage/userDataPaths";
import type { DailyLogEntry } from "./DailyLogEntry";

let writes: Promise<void> = Promise.resolve();

async function writeEntry(entry: DailyLogEntry): Promise<void> {
  const file = dailyLogPath(localDateStamp(new Date(entry.at)));
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.appendFile(file, encodeJsonl([entry]));
}

/** Append to the day's log in order; a failed write must not break the turn. */
export function appendDailyLog(entry: DailyLogEntry): void {
  writes = writes
    .then(() => writeEntry(entry))
    .catch((error) => console.error("Could not write daily log", error));
}
