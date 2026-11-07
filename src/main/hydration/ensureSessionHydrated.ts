import type { Session } from "../../shared/session";
import { loadSessionMeta } from "../storage/sessionMeta";
import { loadTranscript } from "../storage/sessionTranscripts";
import { finalizeStalledTurns } from "../sessions/finalizeStalledTurns";
import { forgetMissingSession } from "./forgetMissingSession";
import type { HydrationHost } from "./HydrationHost";

/** Load meta + transcript into memory the first time a session is opened. */
export async function ensureSessionHydrated(
  host: HydrationHost,
  sessionId: string,
): Promise<Session | null> {
  const session = host.sessions.get(sessionId);
  if (!session) return null;
  if (host.hydrated.has(sessionId)) return session;
  const meta = await loadSessionMeta(sessionId);
  if (!meta) {
    forgetMissingSession(host, sessionId);
    return null;
  }
  session.title = meta.title;
  session.agent = meta.agent;
  session.cwd = meta.cwd;
  session.agentSessionId = meta.agentSessionId;
  session.usage = meta.usage;
  session.modelConfig = meta.modelConfig;
  session.switcherooAware = meta.switcherooAware;
  session.cron = meta.cron;
  const loaded = await loadTranscript(sessionId);
  const items = finalizeStalledTurns(loaded);
  host.transcripts.set(sessionId, items);
  host.hydrated.add(sessionId);
  host.pushTranscript(sessionId);
  host.emitSessions();
  if (items !== loaded) host.queuePersist();
  return session;
}
