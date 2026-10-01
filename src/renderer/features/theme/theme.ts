import type { Theme } from "../../../shared/types";
import { getAppSettingsCache, patchAppSettings } from "../settings/appSettingsCache";

export function readStoredTheme(): Theme {
  return getAppSettingsCache().theme;
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function applyStoredTheme(): Theme {
  const theme = readStoredTheme();
  applyTheme(theme);
  return theme;
}

export function persistTheme(theme: Theme): void {
  applyTheme(theme);
  void patchAppSettings({ theme });
}

export function toggleStoredTheme(): Theme {
  const next = readStoredTheme() === "dark" ? "light" : "dark";
  persistTheme(next);
  return next;
}
