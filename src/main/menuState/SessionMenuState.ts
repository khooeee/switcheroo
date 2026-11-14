import type { SessionPinMenuState } from "./activePinMenuState";

/** Label/enabled state of session menu items for the active tab. All but Stop are off in File Explorer mode. */
export type SessionMenuState = {
  pin: SessionPinMenuState;
  /** New Session, Find in History and the Go menu's tab navigation and filter. */
  sessionsModeEnabled: boolean;
  /** Rename, Mark as Unread and Close: any chat. */
  chatItemsEnabled: boolean;
  forkEnabled: boolean;
  stopEnabled: boolean;
};
