/** One pending reminder; removed once shown. */
export type Reminder = {
  id: string;
  /** ISO 8601 with a UTC offset. */
  dueAt: string;
  message: string;
  /** Session opened by the reminder notification, if any. */
  sessionId?: string;
};
