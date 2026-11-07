import { useEffect, type RefObject } from "react";
import type { ActiveTabId } from "../../../shared/activeTabId";

/** Keep the active session row visible inside the rail scroll container. */
export function useScrollActiveRailSession(
  scrollRef: RefObject<HTMLElement | null>,
  activeSessionId: ActiveTabId,
): void {
  useEffect(() => {
    if (!activeSessionId) return;
    scrollRef.current
      ?.querySelector<HTMLElement>(".rail-session.active")
      ?.scrollIntoView({ block: "nearest" });
  }, [scrollRef, activeSessionId]);
}
