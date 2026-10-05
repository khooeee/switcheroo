import { SWITCHBOARD_ID } from "../../shared/switchboardId";
import { activeIsChildTab } from "./activeIsChildTab";
import type { MenuCtx } from "./MenuCtx";

export function activeStopMenuEnabled(ctx: Pick<MenuCtx, "activeTabId" | "sessions">): boolean {
  if (activeIsChildTab(ctx)) return false;
  if (ctx.activeTabId === SWITCHBOARD_ID) return false;
  return ctx.sessions.get(ctx.activeTabId)?.status === "running";
}
