import { SWITCHBOARD_ID } from "../../shared/switchboardId";
import { sessionPinMenuState, type SessionPinMenuState } from "./sessionPinMenuState";
import { activeSessionId } from "./activeSessionId";
import type { MenuCtx } from "./MenuCtx";

export function activePinMenuState(ctx: MenuCtx): SessionPinMenuState {
  const sessionId = activeSessionId(ctx);
  return sessionPinMenuState(
    sessionId ?? SWITCHBOARD_ID,
    ctx.pinnedIds,
    sessionId ? ctx.sessions.has(sessionId) : false,
  );
}
