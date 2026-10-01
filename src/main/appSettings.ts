import type { AppSettings } from "../shared/types";
import { defaultAppSettings, mergeAppSettings } from "../shared/types";

let current: AppSettings = defaultAppSettings();

export function getAppSettings(): AppSettings {
  return { ...current };
}

export function hydrateAppSettings(partial?: Partial<AppSettings> | null): AppSettings {
  current = mergeAppSettings(partial);
  return getAppSettings();
}

export function patchAppSettings(partial: Partial<AppSettings>): AppSettings {
  current = { ...current, ...partial };
  return getAppSettings();
}
