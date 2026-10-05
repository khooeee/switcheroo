import { SWITCHBOARD_ID } from "../../shared/switchboardId";
import { sessionPinMenuState, type SessionPinMenuState } from "./sessionPinMenuState";
import { activeIsChildTab } from "./activeIsChildTab";
import { activeParentSessionId } from "./activeParentSessionId";
import type { MenuCtx } from "./MenuCtx";

export function activePinMenuState(ctx: MenuCtx): SessionPinMenuState {
  const parentId = activeParentSessionId(ctx);
  if (activeIsChildTab(ctx)) {
    const pinned = !!parentId && ctx.pinnedIds.includes(parentId);
    return { label: pinned ? "Unpin" : "Pin", enabled: false };
  }
  return sessionPinMenuState(
    parentId ?? SWITCHBOARD_ID,
    ctx.pinnedIds,
    parentId ? ctx.sessions.has(parentId) : false,
  );
}
