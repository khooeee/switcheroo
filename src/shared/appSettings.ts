import type { AgentKind } from "./agentKind";

export type Theme = "light" | "dark";

/** UI preferences persisted in switcheroo.json. */
export interface AppSettings {
  theme: Theme;
  zenMode: boolean;
  soundEnabled: boolean;
  railWidth: number;
  rightRailWidth: number;
  composerHeight: number;
  lastAgent: AgentKind;
  lastCwd: string;
  lastPrefix: string;
  lastPin: boolean;
  lastSwitcherooAware: boolean;
  /** Drop Switchboard turns older than this many days on startup. */
  cleanSwitchboardTurnsOlderThanDays: number;
  /** Soft-close oldest rail sessions on startup when over this (0 = unlimited). */
  sessionListMax: number;
}
