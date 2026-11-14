import type { ReminderInput } from "../../shared/reminderInput";
import { addReminder } from "./addReminder";
import { localIsoTime } from "./localIsoTime";
import { resolveDueAt } from "./resolveDueAt";
import { updateReminders } from "./updateReminders";

/** Edit only the requested reminder, preserving its session and concurrent changes. */
export function saveReminder(input: ReminderInput) {
  if (input.id === undefined) return addReminder({ message: input.message, at: input.dueAt });
  const message = input.message.trim();
  if (!message) throw new Error("message is required");
  const dueAt = localIsoTime(resolveDueAt(input.dueAt, undefined));
  return updateReminders((reminders) => {
    const index = reminders.findIndex((reminder) => reminder.id === input.id);
    if (index < 0) throw new Error("This reminder has already fired or been cancelled.");
    const updated = { ...reminders[index], message, dueAt };
    return [reminders.map((reminder, i) => i === index ? updated : reminder), updated];
  });
}
