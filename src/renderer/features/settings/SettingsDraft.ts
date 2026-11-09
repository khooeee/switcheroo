import type { Theme } from "../../../shared/appSettings";
import type { VoiceReasoningEffort } from "../../../shared/voiceReasoningEffort";

/** Settings modal form state; number fields stay text while typing. */
export type SettingsDraft = {
  theme: Theme;
  soundEnabled: boolean;
  sessionListMax: string;
  /** null until edited, so an untouched field keeps the saved key. */
  voiceKey: string | null;
  voiceModel: string;
  voiceReasoning: VoiceReasoningEffort;
  voiceName: string;
  voiceLanguage: string;
  voiceIdleMinutes: string;
  remoteEnabled: boolean;
  remotePort: string;
};
