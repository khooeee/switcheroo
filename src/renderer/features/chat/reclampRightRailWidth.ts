import { readCssPx } from "../layout/readCssPx";
import { rightRailWidth } from "./rightRailWidth";

/** Re-apply the shown tab's right rail width against the current window when visible. */
export function reclampRightRailWidth(): number {
  if (readCssPx("--right-rail") <= 0) return 0;
  return rightRailWidth.apply(rightRailWidth.read(), false);
}
