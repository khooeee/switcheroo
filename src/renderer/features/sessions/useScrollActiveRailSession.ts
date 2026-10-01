import { useEffect, type RefObject } from "react";
import type { ActiveSessionId } from "../../../shared/types";
import { SWITCHBOARD_ID } from "../../../shared/types";

/** Keep the active session row visible inside the rail scroll container. */
export function useScrollActiveRailSession(
  scrollRef: RefObject<HTMLElement | null>,
  activeSessionId: ActiveSessionId,
): void {
  useEffect(() => {
    if (activeSessionId === SWITCHBOARD_ID) return;
    scrollRef.current
      ?.querySelector<HTMLElement>(".rail-session.active")
      ?.scrollIntoView({ block: "nearest" });
  }, [scrollRef, activeSessionId]);
}
