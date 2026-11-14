import { randomBytes } from "node:crypto";
import { localIsoTime } from "./localIsoTime";
import type { Reminder } from "../../shared/reminder";
import { resolveDueAt } from "./resolveDueAt";
import { updateReminders } from "./updateReminders";

/** Save a reminder due `at` a time or in `inMinutes` (exactly one), optionally tied to a session. */
export async function addReminder(input: {
  message: string;
  at?: unknown;
  inMinutes?: number;
  sessionId?: string;
}): Promise<Reminder> {
  const message = input.message.trim();
  if (!message) throw new Error("message is required");
  const reminder: Reminder = {
    id: randomBytes(4).toString("hex"),
    dueAt: localIsoTime(resolveDueAt(input.at, input.inMinutes)),
    message,
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
  };
  await updateReminders((reminders) => [[...reminders, reminder], undefined]);
  return reminder;
}
