import { MAX_PINNED_SESSIONS } from "../../shared/maxPinnedSessions";
import { activeSessionId } from "./activeSessionId";
import type { MenuCtx } from "./MenuCtx";

export type SessionPinMenuState = {
  label: "Pin" | "Unpin";
  enabled: boolean;
};

/** Label/enabled for Session → Pin/Unpin based on the active session. */
export function activePinMenuState(ctx: MenuCtx): SessionPinMenuState {
  const sessionId = activeSessionId(ctx);
  if (!sessionId) return { label: "Pin", enabled: false };
  if (ctx.pinnedIds.includes(sessionId)) return { label: "Unpin", enabled: true };
  return { label: "Pin", enabled: ctx.pinnedIds.length < MAX_PINNED_SESSIONS };
}
