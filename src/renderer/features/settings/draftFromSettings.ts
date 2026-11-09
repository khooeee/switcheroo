import type { AppSettings } from "../../../shared/appSettings";
import type { SettingsDraft } from "./SettingsDraft";

export function draftFromSettings(prefs: AppSettings): SettingsDraft {
  return {
    theme: prefs.theme,
    soundEnabled: prefs.soundEnabled,
    sessionListMax: String(prefs.sessionListMax),
    voiceKey: null,
    voiceModel: prefs.voiceModel,
    voiceReasoning: prefs.voiceReasoning,
    voiceName: prefs.voiceName,
    voiceLanguage: prefs.voiceLanguage,
    voiceIdleMinutes: String(prefs.voiceIdleMinutes),
    remoteEnabled: prefs.remoteEnabled,
    remotePort: String(prefs.remotePort),
  };
}
