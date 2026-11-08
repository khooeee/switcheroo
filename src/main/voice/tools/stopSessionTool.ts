import { resolveToolSession } from "../resolveToolSession";
import { sessionLabel } from "../sessionLabel";
import { toolArgs } from "../toolArgs";
import type { VoiceToolContext } from "../VoiceToolContext";

/** Select the session and cancel its running turn; the session and its work stay. */
export async function stopSessionTool(ctx: VoiceToolContext, args: Record<string, unknown>): Promise<unknown> {
  const resolved = resolveToolSession(ctx, toolArgs.string(args, "session"));
  if (!resolved.ok) return resolved;
  const { session } = resolved;
  await ctx.sessions.setActiveTab(session.id);
  if (session.status !== "running") return { ok: true, session: sessionLabel(session), note: "It was not working." };
  await ctx.sessions.cancelPrompt(session.id);
  return { ok: true, stopped: sessionLabel(session) };
}
