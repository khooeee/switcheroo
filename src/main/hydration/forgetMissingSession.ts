import { SWITCHBOARD_ID } from "../../shared/switchboardId";
import { removeSessionFromLists } from "../railLists/removeSessionFromLists";
import type { HydrationHost } from "./HydrationHost";

/** Session folder missing: drop open entry + Switchboard events and tell the UI. */
export function forgetMissingSession(host: HydrationHost, sessionId: string): void {
  const title =
    host.sessions.get(sessionId)?.title ??
    host.bus.list().find((event) => event.sessionId === sessionId)?.sessionTitle ??
    "Session";
  if (host.sessions.has(sessionId)) {
    host.sessions.delete(sessionId);
    host.transcripts.delete(sessionId);
    host.hydrated.delete(sessionId);
    host.setRailLists(removeSessionFromLists(host.railLists, sessionId));
    if (host.activeParentSessionId() === sessionId || host.activeTabId === sessionId) {
      host.setActiveTabId(SWITCHBOARD_ID);
    }
    host.emitSessions();
  }
  host.bus.removeSession(sessionId);
  host.send("switchboard:session-removed", {
    sessionId,
    message: `Session “${title}” is no longer on disk and was removed from Switchboard.`,
  });
  host.persist();
}
