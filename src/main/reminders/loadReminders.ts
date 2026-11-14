import * as fs from "node:fs/promises";
import { errorMessage } from "../../shared/errorMessage";
import { isMissingFile } from "../storage/isMissingFile";
import { remindersPath } from "../storage/userDataPaths";
import type { Reminder } from "../../shared/reminder";
import { parseRemindersFile } from "./parseRemindersFile";

/** Read reminders.json. A missing file means none; problems come back as errors, never thrown. */
export async function loadReminders(): Promise<{ reminders: Reminder[]; errors: string[] }> {
  let raw: string;
  try {
    raw = await fs.readFile(remindersPath(), "utf8");
  } catch (error) {
    if (isMissingFile(error)) return { reminders: [], errors: [] };
    return { reminders: [], errors: [String(error)] };
  }
  if (!raw.trim()) return { reminders: [], errors: [] };
  try {
    return parseRemindersFile(JSON.parse(raw));
  } catch (error) {
    return { reminders: [], errors: [`invalid JSON: ${errorMessage(error)}`] };
  }
}
