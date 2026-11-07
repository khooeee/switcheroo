import { SWITCHBOARD_ID } from "../../shared/switchboardId";
import type { MenuCtx } from "./MenuCtx";

export function activeUnreadMenuEnabled(ctx: Pick<MenuCtx, "activeTabId" | "sessions">): boolean {
  return ctx.activeTabId !== SWITCHBOARD_ID && ctx.sessions.has(ctx.activeTabId);
}
