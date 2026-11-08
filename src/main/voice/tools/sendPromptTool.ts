import type { Session } from "../../../shared/session";
import { resolveToolSession } from "../resolveToolSession";
import { sessionLabel } from "../sessionLabel";
import { toolArgs } from "../toolArgs";
import type { VoiceToolContext } from "../VoiceToolContext";

/** How a prompt lands: steering is only known once the agent has reported support. */
function delivery(session: Session): string {
  if (session.status !== "running") return "sent";
  if (session.supportsSteering === true) return "steered into the running turn";
  if (session.supportsSteering === false) return "queued behind the running turn";
  return "sent while it is working";
}

/** Select a session and send it the user's instruction (steers or queues when it is busy). */
export async function sendPromptTool(ctx: VoiceToolContext, args: Record<string, unknown>): Promise<unknown> {
  const text = toolArgs.string(args, "text");
  if (!text) return { ok: false, error: "text is required." };
  const resolved = resolveToolSession(ctx, toolArgs.string(args, "session"));
  if (!resolved.ok) return resolved;
  const { session } = resolved;
  const landed = delivery(session);
  await ctx.sessions.setActiveTab(session.id);
  await ctx.sessions.enqueuePrompt(session.id, text);
  return { ok: true, session: sessionLabel(session), delivery: landed };
}
