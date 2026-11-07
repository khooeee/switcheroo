import { activeSessionId } from "./activeSessionId";
import type { MenuCtx } from "./MenuCtx";

export function activeOpenInCursorEnabled(
  ctx: Pick<MenuCtx, "activeTabId" | "sessions">,
): boolean {
  const sessionId = activeSessionId(ctx);
  if (!sessionId) return false;
  return !!ctx.sessions.get(sessionId)?.cwd.trim();
}
