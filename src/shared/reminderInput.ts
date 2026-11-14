/** An omitted id creates a reminder; an existing id edits it. */
export type ReminderInput = {
  id?: string;
  message: string;
  dueAt: string;
};
