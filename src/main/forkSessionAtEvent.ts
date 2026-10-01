import type { Session, TranscriptTurn } from "../shared/types";
import { nextForkTitle } from "../shared/nextForkTitle";
import type { AcpSession } from "./acp/session";
import type { GlobalEventBus } from "./events";
import type { SessionCallbacks } from "./acp/SessionCallbacks";
import { newSessionId } from "./newSessionId";
import { TurnBuilder } from "./acp/TurnBuilder";

interface ForkSessionHost {
  getSession(sessionId: string): Session | undefined;
  getTranscript(sessionId: string): TranscriptTurn[];
  listTitles(): string[];
  ensureSession(session: Session): Promise<AcpSession>;
  callbacksFor(session: Session): SessionCallbacks;
  bus(): GlobalEventBus;
  setSession(sessionId: string, session: AcpSession): void;
  addSession(session: Session, transcript: TranscriptTurn[]): void;
  setActiveSession(sessionId: string): void;
  emitSessions(): void;
  send(channel: string, payload: unknown): void;
  persist(): Promise<void>;
}

function rewindId(turns: TranscriptTurn[], eventId: string): string {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const turn = turns[i]!;
    if (turn.assistant) return turn.assistant.id;
    for (let j = turn.events.length - 1; j >= 0; j -= 1) {
      if (turn.events[j]!.role === "assistant") return turn.events[j]!.id;
    }
  }
  return eventId;
}

function clipTurns(turns: TranscriptTurn[], eventId: string): TranscriptTurn[] {
  const builder = new TurnBuilder(() => undefined);
  builder.restore(turns);
  const clipped = builder.clipThrough(eventId);
  if (!clipped) throw new Error("Event not found in this session");
  return clipped;
}

/** Create a forked session. With `eventId`, history ends there; otherwise the full transcript is kept. */
export async function forkSessionAtEvent(
  host: ForkSessionHost,
  sessionId: string,
  eventId?: string,
): Promise<Session> {
  const source = host.getSession(sessionId);
  if (!source) throw new Error("Session not found");

  const turns = host.getTranscript(sessionId);
  let clipped: TranscriptTurn[];
  let rewindTo: string | undefined;
  if (eventId) {
    clipped = clipTurns(turns, eventId);
    rewindTo = rewindId(clipped, eventId);
  } else {
    clipped = turns.map((turn) => ({
      ...turn,
      user: { ...turn.user },
      assistant: turn.assistant ? { ...turn.assistant } : null,
      events: turn.events.map((event) => ({ ...event })),
      fileChanges: turn.fileChanges.map((change) => ({ ...change })),
    }));
  }

  const sourceSession = await host.ensureSession(source);

  const id = newSessionId();
  const session: Session = {
    id,
    title: nextForkTitle(source.title, host.listTitles()),
    agent: source.agent,
    cwd: source.cwd,
    agentSessionId: null,
    status: "connecting",
    error: null,
    createdAt: Date.now(),
  };
  host.addSession(session, clipped);
  host.setActiveSession(id);
  host.emitSessions();
  host.send("transcript:reset", { sessionId: id, turns: clipped });

  try {
    const acp = await sourceSession.forkSibling(
      id,
      host.bus(),
      host.callbacksFor(session),
      rewindTo,
    );
    acp.restoreTurns(clipped);
    host.setSession(id, acp);
    session.agentSessionId = acp.sessionId;
    session.status = "ready";
    session.error = null;
    host.emitSessions();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    session.status = "error";
    session.error = msg;
    host.emitSessions();
    throw err;
  }

  await host.persist();
  return session;
}
