import { resolveToolSession } from "../resolveToolSession";
import { sessionLabel } from "../sessionLabel";
import { toolArgs } from "../toolArgs";
import type { VoiceToolContext } from "../VoiceToolContext";

/** Switch the main panel to the session (only when the user asks to see it). */
export async function showSessionTool(ctx: VoiceToolContext, args: Record<string, unknown>): Promise<unknown> {
  const resolved = resolveToolSession(ctx, toolArgs.string(args, "session"));
  if (!resolved.ok) return resolved;
  await ctx.sessions.setActiveTab(resolved.session.id);
  return { ok: true, showing: sessionLabel(resolved.session) };
}
