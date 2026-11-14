import { listReminders } from "../../reminders/listReminders";
import { localIsoTime } from "../../reminders/localIsoTime";
import { sessionLabel } from "../sessionLabel";
import type { VoiceToolContext } from "../VoiceToolContext";

/** Pending reminders, soonest first, with the session each one is linked to. */
export async function listRemindersTool(ctx: VoiceToolContext): Promise<unknown> {
  const { reminders, errors } = await listReminders();
  return {
    ok: true,
    now: localIsoTime(new Date()),
    reminders: reminders.map((reminder) => {
      const session = reminder.sessionId ? ctx.sessions.getSession(reminder.sessionId) : undefined;
      return {
        id: reminder.id,
        due: reminder.dueAt,
        message: reminder.message,
        ...(session ? { session: sessionLabel(session) } : {}),
      };
    }),
    ...(errors.length ? { errors } : {}),
  };
}
