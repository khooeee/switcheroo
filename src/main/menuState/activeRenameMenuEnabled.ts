import { SWITCHBOARD_ID } from "../../shared/switchboardId";
import type { MenuCtx } from "./MenuCtx";

export function activeRenameMenuEnabled(ctx: Pick<MenuCtx, "activeTabId" | "sessions">): boolean {
  return ctx.activeTabId !== SWITCHBOARD_ID && ctx.sessions.has(ctx.activeTabId);
}
