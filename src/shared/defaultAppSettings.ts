import type { AppSettings } from "./appSettings";

export function defaultAppSettings(): AppSettings {
  return {
    theme: "dark",
    zenMode: true,
    soundEnabled: true,
    railWidth: 160,
    rightRailWidth: 320,
    composerHeight: 72,
    lastAgent: "claude",
    lastCwd: "",
    lastPrefix: "",
    lastPin: false,
    lastSwitcherooAware: false,
    sessionListMax: 500,
    voiceModel: "inworld/models/mimo-v2.6-pro",
    voiceReasoning: "NONE",
    voiceName: "Sarah",
    voiceLanguage: "English",
    voiceIdleMinutes: 30,
  };
}
