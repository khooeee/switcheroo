import type { AgentKind } from "./agentKind";
import type { RailMode } from "./railMode";
import type { VoiceReasoningEffort } from "./voiceReasoningEffort";

export type Theme = "light" | "dark";

/** UI preferences persisted in switcheroo.json. */
export interface AppSettings {
  theme: Theme;
  zenMode: boolean;
  soundEnabled: boolean;
  railWidth: number;
  /** Rail shows Sessions or the File Explorer. */
  railMode: RailMode;
  rightRailWidth: number;
  composerHeight: number;
  lastAgent: AgentKind;
  lastCwd: string;
  lastPin: boolean;
  /** Soft-close oldest rail sessions on startup when over this (0 = unlimited). */
  sessionListMax: number;
  /** Inworld realtime LLM; also answers web searches. */
  voiceModel: string;
  /** Reasoning effort for the realtime LLM; NONE keeps spoken replies fast. */
  voiceReasoning: VoiceReasoningEffort;
  /** Inworld TTS voice name. */
  voiceName: string;
  /** Language the voice agent speaks and expects to hear, interpolated into its instructions. */
  voiceLanguage: string;
  /** Turn voice off after this many minutes without speech (0 = never). */
  voiceIdleMinutes: number;
  /** Accept control API requests that arrive through `tailscale serve` (the iOS app). */
  remoteEnabled: boolean;
  /** Fixed localhost port of the control API, so `tailscale serve` can point at it. */
  controlPort: number;
}
