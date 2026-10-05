import type { Theme } from "../../../shared/appSettings";
import { getAppSettingsCache, patchAppSettings } from "../settings/appSettingsCache";

function readStoredTheme(): Theme {
  return getAppSettingsCache().theme;
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function applyStoredTheme(): Theme {
  const theme = readStoredTheme();
  applyTheme(theme);
  return theme;
}

export function toggleStoredTheme(): Theme {
  const next = readStoredTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  void patchAppSettings({ theme: next });
  return next;
}
