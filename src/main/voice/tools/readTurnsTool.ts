import { resolveToolSession } from "../resolveToolSession";
import { sessionLabel } from "../sessionLabel";
import { toolArgs } from "../toolArgs";
import { turnSnapshot } from "../turnSnapshot";
import type { VoiceToolContext } from "../VoiceToolContext";

/** The session's last few prompt/reply pairs, oldest first. */
export async function readTurnsTool(ctx: VoiceToolContext, args: Record<string, unknown>): Promise<unknown> {
  const resolved = resolveToolSession(ctx, toolArgs.string(args, "session"));
  if (!resolved.ok) return resolved;
  const count = Math.min(10, Math.max(1, Math.round(toolArgs.number(args, "count") ?? 3)));
  const turns = await ctx.sessions.getTranscript(resolved.session.id);
  return {
    title: sessionLabel(resolved.session),
    turns: turns.slice(-count).map((turn) => turnSnapshot(turn, 600)),
  };
}
