import { useEffect, type RefObject } from "react";
import type { ActiveTabId } from "../../../shared/activeTabId";
import { SWITCHBOARD_ID } from "../../../shared/switchboardId";

/** Keep the active session row visible inside the rail scroll container. */
export function useScrollActiveRailSession(
  scrollRef: RefObject<HTMLElement | null>,
  activeSessionId: ActiveTabId,
): void {
  useEffect(() => {
    if (activeSessionId === SWITCHBOARD_ID) return;
    scrollRef.current
      ?.querySelector<HTMLElement>(".rail-session.active")
      ?.scrollIntoView({ block: "nearest" });
  }, [scrollRef, activeSessionId]);
}
