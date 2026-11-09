import type { BrowserWindow } from "electron";
import type { SessionMenuState } from "../menuState/SessionMenuState";
import type { VoiceMenuActions } from "./VoiceMenuActions";

/** Getters and actions the application menu reads from the main process. */
export type AppMenuOptions = {
  getMainWindow: () => BrowserWindow | null;
  getMenuState: () => SessionMenuState;
  openActiveInCursor: () => void;
  /** Give the active session Switcheroo's MCP tools. */
  makeActiveSwitcherooAware: () => void;
  getActiveUnread: () => boolean;
  voice: VoiceMenuActions;
};
