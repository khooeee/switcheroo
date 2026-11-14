import { cancelReminder } from "../../reminders/cancelReminder";
import { toolArgs } from "../toolArgs";
import type { VoiceToolContext } from "../VoiceToolContext";

/** Cancel a pending reminder by the id list_reminders gave. */
export async function cancelReminderTool(_ctx: VoiceToolContext, args: Record<string, unknown>): Promise<unknown> {
  const id = toolArgs.string(args, "id");
  if (!id) return { ok: false, error: "Give the reminder id from list_reminders." };
  const cancelled = await cancelReminder(id);
  return cancelled ? { ok: true, cancelled: cancelled.message } : { ok: false, error: "No pending reminder has that id." };
}
