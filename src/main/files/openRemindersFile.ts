import { openOrCreateFile } from "./openOrCreateFile";
import { remindersPath } from "../storage/userDataPaths";

/** Open reminders.json in the default app (create an empty one if missing). */
export function openRemindersFile(): Promise<void> {
  return openOrCreateFile(remindersPath(), `${JSON.stringify({ reminders: [] }, null, 2)}\n`);
}
