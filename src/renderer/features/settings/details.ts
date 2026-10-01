import { getAppSettingsCache, patchAppSettings } from "./appSettingsCache";

/** Details visible when zen mode is off. */
export function readDetailsVisible(): boolean {
  return !getAppSettingsCache().zenMode;
}

export function applyDetailsVisible(visible: boolean): void {
  document.documentElement.dataset.details = visible ? "shown" : "hidden";
}

export function applyStoredDetails(): boolean {
  const visible = readDetailsVisible();
  applyDetailsVisible(visible);
  return visible;
}

export function toggleDetailsVisible(): boolean {
  const nextVisible = !readDetailsVisible();
  applyDetailsVisible(nextVisible);
  void patchAppSettings({ zenMode: !nextVisible });
  return nextVisible;
}

/** Turn details on (exit zen mode) if currently hidden. */
export function ensureDetailsVisible(): void {
  if (readDetailsVisible()) return;
  applyDetailsVisible(true);
  void patchAppSettings({ zenMode: false });
}
