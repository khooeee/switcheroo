import type { Session } from "../../shared/session";
import { loadSessionMeta } from "../sessionMeta";
import { sessionFromMeta } from "../sessionFromMeta";
import { loadTranscript } from "../sessionTranscripts";
import { finalizeStalledTurns } from "../finalizeStalledTurns";
import type { HydrationHost } from "./HydrationHost";

/** Re-open a closed-but-on-disk session onto the rail. */
export async function reopenSession(
  host: HydrationHost,
  sessionId: string,
): Promise<Session | null> {
  const meta = await loadSessionMeta(sessionId);
  if (!meta) return null;
  const loaded = await loadTranscript(sessionId);
  const items = finalizeStalledTurns(loaded);
  const session = sessionFromMeta(sessionId, meta);
  host.prependSession(session);
  host.transcripts.set(sessionId, items);
  host.hydrated.add(sessionId);
  host.pushTranscript(sessionId);
  if (items !== loaded) host.queuePersist();
  return session;
}
