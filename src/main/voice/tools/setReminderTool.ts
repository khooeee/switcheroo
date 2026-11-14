import { addReminder } from "../../reminders/addReminder";
import { localIsoTime } from "../../reminders/localIsoTime";
import { resolveToolSession } from "../resolveToolSession";
import { sessionLabel } from "../sessionLabel";
import { toolArgs } from "../toolArgs";
import type { VoiceToolContext } from "../VoiceToolContext";

/** Set a reminder for the user, linked to the named session, else the current one, else none. */
export async function setReminderTool(ctx: VoiceToolContext, args: Record<string, unknown>): Promise<unknown> {
  const message = toolArgs.string(args, "message");
  if (!message) return { ok: false, error: "Give the reminder message." };
  const ref = toolArgs.string(args, "session");
  const resolved = resolveToolSession(ctx, ref);
  // A named session must exist; with none named, a reminder about nothing in particular is fine.
  if (!resolved.ok && ref) return resolved;
  const session = resolved.ok ? resolved.session : undefined;
  const reminder = await addReminder({
    message,
    at: toolArgs.string(args, "at"),
    inMinutes: toolArgs.number(args, "minutes"),
    sessionId: session?.id,
  });
  return {
    ok: true,
    id: reminder.id,
    due: reminder.dueAt,
    now: localIsoTime(new Date()),
    message: reminder.message,
    ...(session ? { session: sessionLabel(session) } : {}),
  };
}
