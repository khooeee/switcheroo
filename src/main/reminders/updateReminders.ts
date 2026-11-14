import { remindersPath } from "../storage/userDataPaths";
import { writeFileAtomic } from "../storage/writeFileAtomic";
import type { Reminder } from "../../shared/reminder";
import { loadReminders } from "./loadReminders";

let queue: Promise<unknown> = Promise.resolve();

/**
 * Read, change and write reminders.json, one change at a time. `change` returns the new list (the same
 * array to skip the write) and a result. A file with errors is left alone so hand edits are never lost.
 */
export function updateReminders<T>(change: (reminders: Reminder[]) => [Reminder[], T]): Promise<T> {
  const run = queue.then(async () => {
    const { reminders, errors } = await loadReminders();
    if (errors.length) throw new Error(`reminders.json needs fixing: ${errors.join("; ")}`);
    const [next, result] = change(reminders);
    if (next !== reminders) {
      const sorted = next.toSorted((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
      await writeFileAtomic(remindersPath(), `${JSON.stringify({ reminders: sorted }, null, 2)}\n`);
    }
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}
