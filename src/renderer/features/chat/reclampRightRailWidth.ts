import { getAppSettingsCache } from "../settings/appSettingsCache";
import { readCssPx } from "../layout/readCssPx";
import { applyRightRailWidth } from "./rightRailWidth";

/** Re-apply the stored right rail width against the current window when visible. */
export function reclampRightRailWidth(): number {
  if (readCssPx("--right-rail") <= 0) return 0;
  return applyRightRailWidth(getAppSettingsCache().rightRailWidth, false);
}
