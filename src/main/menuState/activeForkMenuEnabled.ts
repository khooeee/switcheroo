import type { MenuCtx } from "./MenuCtx";

export function activeForkMenuEnabled(ctx: MenuCtx): boolean {
  const session = ctx.sessions.get(ctx.activeTabId);
  return !!session && ctx.supportsFork(session.agent);
}
