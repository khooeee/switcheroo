import type { AppSettings } from "../../../shared/types";
import { defaultAppSettings, mergeAppSettings } from "../../../shared/types";

let cache: AppSettings = defaultAppSettings();
const CHANGE = "switcheroo:settings-changed";

function emitChange(): void {
  window.dispatchEvent(new CustomEvent(CHANGE, { detail: cache }));
}

/** Load settings from main into the renderer cache. */
export async function loadAppSettings(): Promise<AppSettings> {
  cache = mergeAppSettings(await window.switcheroo.getSettings());
  emitChange();
  return cache;
}

export function getAppSettingsCache(): AppSettings {
  return cache;
}

/** Replace the in-memory cache (boot helpers / tests). */
export function replaceAppSettingsCache(next: AppSettings): void {
  cache = next;
  emitChange();
}

export async function patchAppSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  cache = { ...cache, ...patch };
  emitChange();
  cache = await window.switcheroo.updateSettings(patch);
  emitChange();
  return cache;
}

export function subscribeAppSettings(listener: () => void): () => void {
  const onChange = () => listener();
  window.addEventListener(CHANGE, onChange);
  return () => window.removeEventListener(CHANGE, onChange);
}
