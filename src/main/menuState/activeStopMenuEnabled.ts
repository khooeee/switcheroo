import { SWITCHBOARD_ID } from "../../shared/switchboardId";
import type { MenuCtx } from "./MenuCtx";

export function activeStopMenuEnabled(ctx: Pick<MenuCtx, "activeTabId" | "sessions">): boolean {
  if (ctx.activeTabId === SWITCHBOARD_ID) return false;
  return ctx.sessions.get(ctx.activeTabId)?.status === "running";
}
