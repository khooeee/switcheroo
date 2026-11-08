import { getAppSettingsCache, subscribeAppSettings } from "../settings/appSettingsCache";

export const soundPreference = {
  getSnapshot(): boolean {
    return getAppSettingsCache().soundEnabled;
  },

  subscribe(listener: () => void): () => void {
    return subscribeAppSettings(listener);
  },
};
