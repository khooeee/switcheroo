import { getAppSettingsCache } from "../settings/appSettingsCache";
import { applyRailWidth } from "./railWidth";

/** Re-apply the stored rail width against the current window (no persist). */
export function reclampRailWidth(): number {
  return applyRailWidth(getAppSettingsCache().railWidth, false);
}
