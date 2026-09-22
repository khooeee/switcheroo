export type Theme = "light" | "dark";

/** Chromium localStorage key for this app's renderer origin. */
export const THEME_STORAGE_KEY = "switcheroo.theme";

export function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
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
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Preference still applies for this session if storage is unavailable.
  }
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent<Theme>("switcheroo:theme", { detail: theme }));
}

export function toggleStoredTheme(): Theme {
  const next = readStoredTheme() === "dark" ? "light" : "dark";
  persistTheme(next);
  return next;
}
