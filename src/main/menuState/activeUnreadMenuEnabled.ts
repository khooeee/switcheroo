import { SWITCHBOARD_ID } from "../../shared/switchboardId";
import { activeIsChildTab } from "./activeIsChildTab";
import type { MenuCtx } from "./MenuCtx";

export function activeUnreadMenuEnabled(ctx: Pick<MenuCtx, "activeTabId" | "sessions">): boolean {
  if (activeIsChildTab(ctx)) return false;
  return ctx.activeTabId !== SWITCHBOARD_ID && ctx.sessions.has(ctx.activeTabId);
}
