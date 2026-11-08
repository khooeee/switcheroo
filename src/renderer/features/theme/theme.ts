import type { Theme } from "../../../shared/appSettings";
import { getAppSettingsCache } from "../settings/appSettingsCache";

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
