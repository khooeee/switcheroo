import { useEffect } from "react";
import { applyRightRailWidth, readRightRailWidth } from "./rightRailWidth";

/** Show the right rail at the stored width while mounted; hide it (keeping the stored width) on unmount. */
export function useShowRightRail(): void {
  useEffect(() => {
    applyRightRailWidth(readRightRailWidth(), false);
    return () => {
      applyRightRailWidth(0, false);
    };
  }, []);
}
