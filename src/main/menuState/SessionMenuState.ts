import type { SessionPinMenuState } from "./activePinMenuState";

/** Label/enabled state of Session menu items for the active tab. */
export type SessionMenuState = {
  pin: SessionPinMenuState;
  /** Rename, Mark as Unread and Close: any chat. */
  chatItemsEnabled: boolean;
  /** The active chat's project folder exists. */
  openInCursorEnabled: boolean;
  forkEnabled: boolean;
  /** The active chat is not Switcheroo aware yet and is not mid-turn. */
  makeAwareEnabled: boolean;
  stopEnabled: boolean;
};
