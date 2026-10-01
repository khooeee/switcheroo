import { SWITCHBOARD_ID, type ActiveSessionId } from "../shared/types";
import { MAX_PINNED_SESSIONS } from "../shared/maxPinnedSessions";

export type SessionPinMenuState = {
  label: "Pin Session" | "Unpin Session";
  enabled: boolean;
};

/** Label/enabled for Session → Pin/Unpin based on the active session. */
export function sessionPinMenuState(
  activeSessionId: ActiveSessionId,
  pinnedIds: string[],
  sessionExists: boolean,
): SessionPinMenuState {
  if (activeSessionId === SWITCHBOARD_ID || !sessionExists) {
    return { label: "Pin Session", enabled: false };
  }
  if (pinnedIds.includes(activeSessionId)) {
    return { label: "Unpin Session", enabled: true };
  }
  return {
    label: "Pin Session",
    enabled: pinnedIds.length < MAX_PINNED_SESSIONS,
  };
}
