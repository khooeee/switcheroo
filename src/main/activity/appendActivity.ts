import * as fs from "node:fs/promises";
import * as path from "node:path";
import { encodeJsonl } from "../storage/encodeJsonl";
import { localDateStamp } from "../storage/localDateStamp";
import { activityLogPath } from "../storage/userDataPaths";
import type { ActivityEntry } from "./ActivityEntry";

let writes: Promise<void> = Promise.resolve();

async function writeEntry(entry: ActivityEntry): Promise<void> {
  const file = activityLogPath(localDateStamp(new Date(entry.at)));
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.appendFile(file, encodeJsonl([entry]));
}

/** Append to the day's log in order; a failed write must not break the turn. */
export function appendActivity(entry: ActivityEntry): void {
  writes = writes
    .then(() => writeEntry(entry))
    .catch((error) => console.error("Could not log activity", error));
}
