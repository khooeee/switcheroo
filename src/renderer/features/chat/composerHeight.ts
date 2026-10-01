import { getAppSettingsCache, patchAppSettings } from "../settings/appSettingsCache";

const DEFAULT_HEIGHT = 72;

function normalize(value: number): number {
  return Number.isFinite(value) ? Math.max(DEFAULT_HEIGHT, Math.round(value)) : DEFAULT_HEIGHT;
}

export const composerHeight = {
  read(): number {
    return normalize(getAppSettingsCache().composerHeight);
  },

  apply(height: number, persist = false): number {
    const next = normalize(height);
    document.documentElement.style.setProperty("--composer-input-height", `${next}px`);
    if (persist) void patchAppSettings({ composerHeight: next });
    return next;
  },
};
