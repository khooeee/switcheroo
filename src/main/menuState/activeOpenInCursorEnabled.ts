import { activeParentSessionId } from "./activeParentSessionId";
import type { MenuCtx } from "./MenuCtx";

export function activeOpenInCursorEnabled(
  ctx: Pick<MenuCtx, "activeTabId" | "sessions">,
): boolean {
  const parentId = activeParentSessionId(ctx);
  if (!parentId) return false;
  return !!ctx.sessions.get(parentId)?.cwd.trim();
}
