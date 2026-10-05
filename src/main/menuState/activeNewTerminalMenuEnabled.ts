import { activeParentSessionId } from "./activeParentSessionId";
import type { MenuCtx } from "./MenuCtx";

export function activeNewTerminalMenuEnabled(
  ctx: Pick<MenuCtx, "activeTabId" | "sessions">,
): boolean {
  return activeParentSessionId(ctx) !== null;
}
