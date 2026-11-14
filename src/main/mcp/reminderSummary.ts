import type { Reminder } from "../reminders/Reminder";

/** What an agent sees of a reminder; `mine` marks the caller's own. */
export function reminderSummary(reminder: Reminder, callerId: string) {
  return {
    id: reminder.id,
    dueAt: reminder.dueAt,
    message: reminder.message,
    ...(reminder.sessionId === callerId ? { mine: true } : reminder.sessionId ? { sessionId: reminder.sessionId } : {}),
  };
}
