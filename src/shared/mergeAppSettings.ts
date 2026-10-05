import type { AppSettings } from "./appSettings";
import { defaultAppSettings } from "./defaultAppSettings";

export function mergeAppSettings(partial?: Partial<AppSettings> | null): AppSettings {
  return { ...defaultAppSettings(), ...partial };
}
