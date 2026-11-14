import { clipText } from "../../../shared/clipText";
import { addReminder } from "../../reminders/addReminder";
import { localIsoTime } from "../../reminders/localIsoTime";
import { resolveDueAt } from "../../reminders/resolveDueAt";
import { resolveToolSession } from "../resolveToolSession";
import { sessionLabel } from "../sessionLabel";
import { toolArgs } from "../toolArgs";
import type { VoiceToolContext } from "../VoiceToolContext";
import { createSessionTool } from "./createSessionTool";

/**
 * Set a reminder linked to the named session, else the current one. With neither, start a session and
 * have it set the reminder, so every reminder belongs to a session.
 */
export async function setReminderTool(ctx: VoiceToolContext, args: Record<string, unknown>): Promise<unknown> {
  const message = toolArgs.string(args, "message");
  if (!message) return { ok: false, error: "Give the reminder message." };
  const ref = toolArgs.string(args, "session");
  const resolved = resolveToolSession(ctx, ref);
  if (!resolved.ok && ref) return resolved;
  // Fixed now, so the new session's startup doesn't push the reminder later.
  const due = localIsoTime(resolveDueAt(toolArgs.string(args, "at"), toolArgs.number(args, "minutes")));
  const now = localIsoTime(new Date());
  if (!resolved.ok) {
    const created = await createSessionTool(ctx, {
      title: `Reminder: ${clipText(message, 50)}`,
      prompt: `Call the set_reminder tool with message ${JSON.stringify(message)} and at "${due}". Do nothing else.`,
    });
    return (created as { ok?: boolean }).ok
      ? { ...(created as object), due, now, message, note: "No session was open, so this new one is setting the reminder." }
      : created;
  }
  const reminder = await addReminder({ message, at: due, sessionId: resolved.session.id });
  return { ok: true, id: reminder.id, due, now, message, session: sessionLabel(resolved.session) };
}
