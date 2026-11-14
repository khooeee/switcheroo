import { activePinMenuState } from "./activePinMenuState";
import type { MenuCtx } from "./MenuCtx";
import type { SessionMenuState } from "./SessionMenuState";

/** Every Session menu item's state for the active tab. */
export function activeSessionMenuState(ctx: MenuCtx): SessionMenuState {
  const { activeSession, supportsFork } = ctx;
  return {
    pin: activePinMenuState(ctx),
    chatItemsEnabled: !!activeSession,
    openInEditorEnabled: !!activeSession?.cwd.trim(),
    forkEnabled: !!activeSession && supportsFork(activeSession.agent),
    stopEnabled: activeSession?.status === "running",
  };
}
