import { resolveToolSession } from "../resolveToolSession";
import { sessionLabel } from "../sessionLabel";
import { toolArgs } from "../toolArgs";
import type { VoiceToolContext } from "../VoiceToolContext";

/** Select a session and rename, pin or unpin it. */
export async function updateSessionTool(ctx: VoiceToolContext, args: Record<string, unknown>): Promise<unknown> {
  const title = toolArgs.string(args, "title");
  const pinned = toolArgs.boolean(args, "pinned");
  if (!title && pinned === undefined) return { ok: false, error: "Give a new title or pinned." };
  const resolved = resolveToolSession(ctx, toolArgs.string(args, "session"));
  if (!resolved.ok) return resolved;
  const { session } = resolved;
  await ctx.sessions.setActiveTab(session.id);
  if (title) ctx.sessions.renameSession(session.id, title);
  if (pinned === true) ctx.sessions.pinSession(session.id);
  if (pinned === false) ctx.sessions.unpinSession(session.id);
  return { ok: true, session: sessionLabel(session), ...(title ? { title } : {}), ...(pinned !== undefined ? { pinned } : {}) };
}
