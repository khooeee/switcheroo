import type { Session } from "../../shared/session";
import { railSessions } from "./railSessions";
import { resolveSessionRef } from "./resolveSessionRef";
import type { VoiceToolContext } from "./VoiceToolContext";

type Resolved = { ok: true; session: Session } | { ok: false; error: string; candidates?: string[] };

/** Resolve a tool's `session` argument and make it the conversation's focus. */
export function resolveToolSession(ctx: VoiceToolContext, ref: string | undefined): Resolved {
  const { activeTabId } = ctx.sessions.list();
  const resolved = resolveSessionRef(railSessions(ctx.sessions), ref, [ctx.focus.sessionId, activeTabId], ctx.focus.numbered);
  if (resolved.ok) ctx.focus.sessionId = resolved.session.id;
  return resolved;
}
