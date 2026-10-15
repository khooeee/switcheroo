import type { SessionPinMenuState } from "./sessionPinMenuState";

/** Label/enabled state of Session menu items for the active tab. */
export type SessionMenuState = {
  pin: SessionPinMenuState;
  /** Rename and Close: any chat or child tab. */
  renameEnabled: boolean;
  /** The active chat group's project folder exists. */
  openInCursorEnabled: boolean;
  /** Parent chats only. */
  unreadEnabled: boolean;
  forkEnabled: boolean;
  stopEnabled: boolean;
  newTerminalEnabled: boolean;
};
