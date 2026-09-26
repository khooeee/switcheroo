import type { Session, TranscriptItem } from "../shared/types";
import { nextForkTitle } from "../shared/nextForkTitle";
import type { AcpSession } from "./acp/session";
import type { GlobalEventBus } from "./events";
import type { SessionCallbacks } from "./acp/SessionCallbacks";
import { newSessionId } from "./newSessionId";

interface ForkSessionHost {
  getSession(sessionId: string): Session | undefined;
  getTranscript(sessionId: string): TranscriptItem[];
  listTitles(): string[];
  ensureSession(session: Session): Promise<AcpSession>;
  callbacksFor(session: Session): SessionCallbacks;
  bus(): GlobalEventBus;
  setSession(sessionId: string, session: AcpSession): void;
  addSession(tab: Session, transcript: TranscriptItem[]): void;
  setActiveSession(sessionId: string): void;
  emitSessions(): void;
  send(channel: string, payload: unknown): void;
  persist(): Promise<void>;
}

/** Create a forked session. With `eventId`, history ends there; otherwise the full transcript is kept. */
export async function forkSessionAtEvent(
  host: ForkSessionHost,
  sessionId: string,
  eventId?: string,
): Promise<Session> {
  const source = host.getSession(sessionId);
  if (!source) throw new Error("Session not found");

  const items = host.getTranscript(sessionId);
  let clipped: TranscriptItem[];
  let rewindTo: string | undefined;
  if (eventId) {
    const index = items.findIndex((item) => item.id === eventId);
    if (index < 0) throw new Error("Event not found in this session");
    clipped = items.slice(0, index + 1).map((item) => ({ ...item }));
    rewindTo =
      [...clipped].reverse().find((item) => item.role === "assistant")?.id ?? eventId;
  } else {
    clipped = items.map((item) => ({ ...item }));
  }

  const sourceSession = await host.ensureSession(source);

  const id = newSessionId();
  const tab: Session = {
    id,
    title: nextForkTitle(source.title, host.listTitles()),
    agentKind: source.agentKind,
    cwd: source.cwd,
    agentSessionId: null,
    status: "connecting",
    error: null,
    createdAt: Date.now(),
  };
  host.addSession(tab, clipped);
  host.setActiveSession(id);
  host.emitSessions();
  host.send("transcript:reset", { sessionId: id, items: clipped });

  try {
    const session = await sourceSession.forkSibling(
      id,
      host.bus(),
      host.callbacksFor(tab),
      rewindTo,
    );
    host.setSession(id, session);
    tab.agentSessionId = session.sessionId;
    tab.status = "ready";
    tab.error = null;
    host.emitSessions();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    tab.status = "error";
    tab.error = msg;
    host.emitSessions();
    throw err;
  }

  await host.persist();
  return tab;
}
