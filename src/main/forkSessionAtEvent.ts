import type { AgentKind, Session, TranscriptTurn } from "../shared/types";
import { nextForkTitle } from "../shared/nextForkTitle";
import type { AcpSession } from "./acp/session";
import type { SessionCallbacks } from "./acp/SessionCallbacks";
import { newSessionId } from "./newSessionId";
import { TurnBuilder } from "./acp/TurnBuilder";
import { airForkPoint, type AirForkPoint } from "./acp/airForkPoint";
import { agentLabel } from "./acp/presets";

interface ForkSessionHost {
  getSession(sessionId: string): Session | undefined;
  getTranscript(sessionId: string): TranscriptTurn[];
  listTitles(): string[];
  ensureSession(session: Session): Promise<AcpSession>;
  forkSupport(agent: AgentKind): Pick<Session, "supportsFork" | "supportsForkAtMessage">;
  callbacksFor(session: Session): SessionCallbacks;
  setSession(sessionId: string, session: AcpSession): void;
  addSession(session: Session, transcript: TranscriptTurn[]): void;
  setActiveSession(sessionId: string): void;
  emitSessions(): void;
  send(channel: string, payload: unknown): void;
  persist(): Promise<void>;
}

function clipTurns(turns: TranscriptTurn[], eventId: string): TranscriptTurn[] {
  const builder = new TurnBuilder(() => undefined);
  builder.restore(turns);
  const clipped = builder.clipThrough(eventId);
  if (!clipped) throw new Error("Event not found in this session");
  return clipped;
}

/**
 * Create a forked session. With `eventId`, history ends there; otherwise the full transcript is kept.
 * Forking on a user message ends history before its turn and returns that text as a composer draft,
 * so the agent and transcript agree and the message can be edited and resent.
 */
export async function forkSessionAtEvent(
  host: ForkSessionHost,
  sessionId: string,
  eventId?: string,
): Promise<Session> {
  const source = host.getSession(sessionId);
  if (!source) throw new Error("Session not found");

  const turns = host.getTranscript(sessionId);
  let clipped: TranscriptTurn[];
  let forkPoint: AirForkPoint | undefined;
  let draft: string | undefined;
  if (eventId) {
    clipped = clipTurns(turns, eventId);
    const last = clipped.at(-1);
    if (last?.user.id === eventId) {
      draft = last.user.text;
      clipped = clipped.slice(0, -1);
    }
    forkPoint = airForkPoint(clipped);
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
    tabs: [],
    tabsExpanded: true,
  };
  host.addSession(session, clipped);
  host.setActiveSession(id);
  host.emitSessions();
  host.send("transcript:reset", { sessionId: id, turns: clipped, draft });

  try {
    // The UI hides fork when unsupported; this catches agents whose support was unknown until now.
    const support = host.forkSupport(source.agent);
    if (!support.supportsFork) throw new Error(`${agentLabel(source.agent)} does not support forking`);
    if (eventId && !support.supportsForkAtMessage) {
      throw new Error(`${agentLabel(source.agent)} cannot fork from a message`);
    }
    // No assistant message before the fork point leaves no agent history to keep.
    const acp = eventId && !forkPoint
      ? await host.ensureSession(session)
      : await sourceSession.forkSibling(id, host.callbacksFor(session), forkPoint);
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
    // Match createSession: keep the session row and do not reject IPC (Electron
    // replyWithError → console.error can crash the app with write EPIPE).
  }

  await host.persist();
  return session;
}
