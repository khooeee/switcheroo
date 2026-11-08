import type { Session } from "../../shared/session";
import type { SessionManager } from "../sessions/SessionManager";

/** Every rail session in display order: pinned, then unpinned. */
export function railSessions(sessions: SessionManager): Session[] {
  const { pinned, unpinned } = sessions.list();
  return [...pinned, ...unpinned];
}
