import { sessionIdForTab } from "../../shared/tabNav/sessionIdForTab";
import type { MenuCtx } from "./MenuCtx";

export function activeSessionId(ctx: Pick<MenuCtx, "activeTabId" | "sessions">): string | null {
  return sessionIdForTab(ctx.activeTabId, ctx.sessions.values());
}
