import {
  getAppSettingsCache,
  patchAppSettings,
  replaceAppSettingsCache,
  subscribeAppSettings,
} from "../settings/appSettingsCache";

export const soundPreference = {
  /** Test/helper: set in-memory preference without writing settings. */
  hydrate(enabled: boolean): void {
    replaceAppSettingsCache({ ...getAppSettingsCache(), soundEnabled: enabled });
  },

  getSnapshot(): boolean {
    return getAppSettingsCache().soundEnabled;
  },

  subscribe(listener: () => void): () => void {
    return subscribeAppSettings(listener);
  },

  toggle(): void {
    void patchAppSettings({ soundEnabled: !getAppSettingsCache().soundEnabled });
  },
};
