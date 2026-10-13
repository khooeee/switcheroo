import { useLayoutEffect } from "react";
import { rightRailWidth } from "./rightRailWidth";

/**
 * Show the right rail at `tabId`'s width while mounted; hide it (keeping the width) on unmount.
 * Layout effect: the width must be in place before the rail restores its scroll offset.
 */
export function useShowRightRail(tabId: string): void {
  useLayoutEffect(() => {
    rightRailWidth.show(tabId);
    return () => {
      rightRailWidth.hide();
    };
  }, [tabId]);
}
