import { activeForkMenuEnabled } from "./activeForkMenuEnabled";
import { activeOpenInCursorEnabled } from "./activeOpenInCursorEnabled";
import { activePinMenuState } from "./activePinMenuState";
import { activeSessionId } from "./activeSessionId";
import { activeStopMenuEnabled } from "./activeStopMenuEnabled";
import type { MenuCtx } from "./MenuCtx";
import type { SessionMenuState } from "./SessionMenuState";

/** Every Session menu item's state for the active tab. */
export function activeSessionMenuState(ctx: MenuCtx): SessionMenuState {
  return {
    pin: activePinMenuState(ctx),
    chatItemsEnabled: activeSessionId(ctx) !== null,
    openInCursorEnabled: activeOpenInCursorEnabled(ctx),
    forkEnabled: activeForkMenuEnabled(ctx),
    stopEnabled: activeStopMenuEnabled(ctx),
  };
}
