import type { MenuCtx } from "./MenuCtx";

export function activeStopMenuEnabled(ctx: Pick<MenuCtx, "activeTabId" | "sessions">): boolean {
  return ctx.sessions.get(ctx.activeTabId)?.status === "running";
}
