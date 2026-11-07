import type { MenuCtx } from "./MenuCtx";

export type SessionPinMenuState = {
  label: "Pin" | "Unpin";
  enabled: boolean;
};

/** Label/enabled for Session → Pin/Unpin based on the active session. */
export function activePinMenuState({ activeSession, pinnedIds }: MenuCtx): SessionPinMenuState {
  if (!activeSession) return { label: "Pin", enabled: false };
  if (pinnedIds.includes(activeSession.id)) return { label: "Unpin", enabled: true };
  return { label: "Pin", enabled: true };
}
