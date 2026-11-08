import type { VoiceStatus } from "../../shared/voiceStatus";

/** What the Voice menu reads and does. */
export type VoiceMenuActions = {
  getStatus: () => VoiceStatus;
  toggle: () => void;
  openSettings: () => void;
  openLog: () => void;
};
