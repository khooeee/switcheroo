import type { SessionPinMenuState } from "./sessionPinMenuState";

/** Label/enabled state of Session menu items for the active tab. */
export type SessionMenuState = {
  pin: SessionPinMenuState;
  /** Rename and Close: any chat. */
  renameEnabled: boolean;
  /** The active chat's project folder exists. */
  openInCursorEnabled: boolean;
  unreadEnabled: boolean;
  forkEnabled: boolean;
  stopEnabled: boolean;
};
