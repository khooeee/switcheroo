import { useEffect } from "react";
import type { ActiveTabId } from "../../../shared/activeTabId";
import type { SessionTab } from "../../../shared/session";
import { SWITCHBOARD_ID } from "../../../shared/switchboardId";

type OpenRightRail = (turnId: string, focusEventId?: string) => void;

/** Toggle the right rail for `switcheroo:turn-details` events (sent from main via preload). */
export function useTurnDetailsEvent(
  activeTabId: ActiveTabId,
  activeTerminalTab: SessionTab | null,
  toggleSessionRightRail: OpenRightRail,
  toggleSwitchboardRightRail: OpenRightRail,
): void {
  useEffect(() => {
    const onTurnDetails = (event: Event) => {
      const detail = (event as CustomEvent<{ turnId: string; eventId: string }>).detail;
      if (!detail?.turnId || !detail.eventId) return;
      if (activeTabId === SWITCHBOARD_ID) {
        toggleSwitchboardRightRail(detail.turnId, detail.eventId);
      } else if (!activeTerminalTab) {
        toggleSessionRightRail(detail.turnId, detail.eventId);
      }
    };
    window.addEventListener("switcheroo:turn-details", onTurnDetails);
    return () => window.removeEventListener("switcheroo:turn-details", onTurnDetails);
  }, [activeTabId, activeTerminalTab, toggleSessionRightRail, toggleSwitchboardRightRail]);
}
