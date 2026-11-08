import type { AgentKind } from "./agentKind";
import type { VoiceAnnounce } from "./voiceAnnounce";

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
  /** Soft-close oldest rail sessions on startup when over this (0 = unlimited). */
  sessionListMax: number;
  /** Inworld realtime LLM; also answers web searches. */
  voiceModel: string;
  /** Inworld TTS voice name. */
  voiceName: string;
  voiceAnnounce: VoiceAnnounce;
  /** Mute the mic after this many minutes without speech (0 = never). */
  voiceIdleMinutes: number;
}
