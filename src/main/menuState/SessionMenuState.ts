import type { SessionPinMenuState } from "./activePinMenuState";

/** Label/enabled state of Session menu items for the active tab. */
export type SessionMenuState = {
  pin: SessionPinMenuState;
  /** Rename, Mark as Unread and Close: any chat. */
  chatItemsEnabled: boolean;
  forkEnabled: boolean;
  stopEnabled: boolean;
};
