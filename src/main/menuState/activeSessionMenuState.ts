import { activeForkMenuEnabled } from "./activeForkMenuEnabled";
import { activeNewTerminalMenuEnabled } from "./activeNewTerminalMenuEnabled";
import { activeOpenInCursorEnabled } from "./activeOpenInCursorEnabled";
import { activePinMenuState } from "./activePinMenuState";
import { activeRenameMenuEnabled } from "./activeRenameMenuEnabled";
import { activeStopMenuEnabled } from "./activeStopMenuEnabled";
import { activeUnreadMenuEnabled } from "./activeUnreadMenuEnabled";
import type { MenuCtx } from "./MenuCtx";
import type { SessionMenuState } from "./SessionMenuState";

/** Every Session menu item's state for the active tab. */
export function activeSessionMenuState(ctx: MenuCtx): SessionMenuState {
  return {
    pin: activePinMenuState(ctx),
    renameEnabled: activeRenameMenuEnabled(ctx),
    openInCursorEnabled: activeOpenInCursorEnabled(ctx),
    unreadEnabled: activeUnreadMenuEnabled(ctx),
    forkEnabled: activeForkMenuEnabled(ctx),
    stopEnabled: activeStopMenuEnabled(ctx),
    newTerminalEnabled: activeNewTerminalMenuEnabled(ctx),
  };
}
