/** One pending reminder in reminders.json; it is removed once shown. */
export type Reminder = {
  id: string;
  /** ISO 8601; written as local time with its UTC offset, e.g. `2026-11-13T15:00:00-08:00`. */
  dueAt: string;
  message: string;
  /** Session that set it; clicking the notification opens it. Absent for hand-added reminders. */
  sessionId?: string;
};
