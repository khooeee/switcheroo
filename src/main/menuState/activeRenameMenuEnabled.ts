import { SWITCHBOARD_ID } from "../../shared/switchboardId";
import { findChildTab } from "../../shared/tabNav/findChildTab";
import type { MenuCtx } from "./MenuCtx";

export function activeRenameMenuEnabled(ctx: Pick<MenuCtx, "activeTabId" | "sessions">): boolean {
  if (ctx.activeTabId === SWITCHBOARD_ID) return false;
  if (ctx.sessions.has(ctx.activeTabId)) return true;
  return findChildTab(ctx.sessions.values(), ctx.activeTabId) !== null;
}
