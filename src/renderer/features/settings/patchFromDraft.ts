import type { AppSettings } from "../../../shared/appSettings";
import type { SettingsDraft } from "./SettingsDraft";

/** Non-negative whole number from `text`, else `fallback`. */
function wholeNumber(text: string, fallback: number): number {
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : fallback;
}

/** A TCP port from `text`, else `fallback`. */
function port(text: string, fallback: number): number {
  const value = wholeNumber(text, fallback);
  return value >= 1 && value <= 65535 ? value : fallback;
}

/** Settings to save from the form; blank or invalid fields keep `prefs`. The key saves separately. */
export function patchFromDraft(draft: SettingsDraft, prefs: AppSettings): Partial<AppSettings> {
  return {
    theme: draft.theme,
    soundEnabled: draft.soundEnabled,
    sessionListMax: wholeNumber(draft.sessionListMax, prefs.sessionListMax),
    voiceModel: draft.voiceModel.trim() || prefs.voiceModel,
    voiceReasoning: draft.voiceReasoning,
    voiceName: draft.voiceName.trim() || prefs.voiceName,
    voiceLanguage: draft.voiceLanguage.trim() || prefs.voiceLanguage,
    voiceIdleMinutes: wholeNumber(draft.voiceIdleMinutes, prefs.voiceIdleMinutes),
    remoteEnabled: draft.remoteEnabled,
    controlPort: port(draft.controlPort, prefs.controlPort),
  };
}
