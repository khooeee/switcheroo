import type { Reminder } from "../../shared/reminder";
import { updateReminders } from "./updateReminders";

/** Remove a pending reminder; returns it, or undefined when none has that id. */
export function cancelReminder(id: string): Promise<Reminder | undefined> {
  return updateReminders((reminders) => {
    const match = reminders.find((reminder) => reminder.id === id);
    return [match ? reminders.filter((reminder) => reminder !== match) : reminders, match];
  });
}
