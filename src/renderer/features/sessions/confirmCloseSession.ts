import type { Session } from "../../../shared/types";

/** Confirm closing a chat that still has terminal tabs. */
export function confirmCloseSession(
  session: Session,
  onCloseSession: (id: string) => void,
): void {
  if (session.tabs.length > 0) {
    const n = session.tabs.length;
    const ok = window.confirm(`Close this chat and ${n} terminal${n === 1 ? "" : "s"}?`);
    if (!ok) return;
  }
  onCloseSession(session.id);
}
