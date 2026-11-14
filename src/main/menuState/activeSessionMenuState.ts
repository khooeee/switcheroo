import { activePinMenuState } from "./activePinMenuState";
import type { MenuCtx } from "./MenuCtx";
import type { SessionMenuState } from "./SessionMenuState";

/** Every Session menu item's state for the active tab. */
export function activeSessionMenuState(ctx: MenuCtx): SessionMenuState {
  const { activeSession, supportsFork } = ctx;
  const sessionsMode = ctx.railMode === "sessions";
  const pin = activePinMenuState(ctx);
  return {
    pin: { ...pin, enabled: pin.enabled && sessionsMode },
    sessionsModeEnabled: sessionsMode,
    chatItemsEnabled: !!activeSession && sessionsMode,
    forkEnabled: !!activeSession && sessionsMode && supportsFork(activeSession.agent),
    stopEnabled: activeSession?.status === "running",
  };
}
