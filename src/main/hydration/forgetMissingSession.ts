import { removeSessionFromLists } from "../railLists/removeSessionFromLists";
import type { HydrationHost } from "./HydrationHost";

/** Session folder missing: drop the open entry and tell the UI. */
export function forgetMissingSession(host: HydrationHost, sessionId: string): void {
  const title = host.sessions.get(sessionId)?.title;
  if (host.sessions.has(sessionId)) {
    host.sessions.delete(sessionId);
    host.transcripts.delete(sessionId);
    host.hydrated.delete(sessionId);
    host.setRailLists(removeSessionFromLists(host.railLists, sessionId));
    if (host.activeTabId === sessionId) host.setActiveTabId(null);
    host.emitSessions();
  }
  host.send("session:removed", {
    message: `${title ? `Session “${title}”` : "That session"} is no longer on disk and was removed.`,
  });
  host.persist();
}
