import { getAppSettingsCache, patchAppSettings } from "./appSettingsCache";

/** Details visible when zen mode is off. */
function readDetailsVisible(): boolean {
  return !getAppSettingsCache().zenMode;
}

function applyDetailsVisible(visible: boolean): void {
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
