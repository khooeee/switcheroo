import type { Reminder } from "./Reminder";
import { loadReminders } from "./loadReminders";

/** Pending reminders, soonest first, and any problems reading reminders.json. */
export async function listReminders(): Promise<{ reminders: Reminder[]; errors: string[] }> {
  const { reminders, errors } = await loadReminders();
  return { reminders: reminders.toSorted((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt)), errors };
}
