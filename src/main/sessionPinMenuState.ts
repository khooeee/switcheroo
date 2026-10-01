import { SWITCHBOARD_ID, type ActiveSessionId } from "../shared/types";
import { MAX_PINNED_SESSIONS } from "../shared/maxPinnedSessions";

export type SessionPinMenuState = {
  label: "Pin" | "Unpin";
  enabled: boolean;
};

/** Label/enabled for Session → Pin/Unpin based on the active session. */
export function sessionPinMenuState(
  activeSessionId: ActiveSessionId,
  pinnedIds: string[],
  sessionExists: boolean,
): SessionPinMenuState {
  if (activeSessionId === SWITCHBOARD_ID || !sessionExists) {
    return { label: "Pin", enabled: false };
  }
  if (pinnedIds.includes(activeSessionId)) {
    return { label: "Unpin", enabled: true };
  }
  return {
    label: "Pin",
    enabled: pinnedIds.length < MAX_PINNED_SESSIONS,
  };
}
