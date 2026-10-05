import { activeIsChildTab } from "./activeIsChildTab";
import type { MenuCtx } from "./MenuCtx";

export function activeForkMenuEnabled(ctx: MenuCtx): boolean {
  if (activeIsChildTab(ctx)) return false;
  const session = ctx.sessions.get(ctx.activeTabId);
  return !!session && ctx.supportsFork(session.agent);
}
