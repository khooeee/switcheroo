import type { AgentKind } from "../../shared/agentKind";
import type { Session } from "../../shared/session";
import { AcpSession } from "../acp/session";
import type { SessionCallbacks } from "../acp/SessionCallbacks";
import { buildSessionCallbacks } from "../buildSessionCallbacks";
import { newSessionId } from "../newSessionId";
import type { SessionState } from "./SessionState";
import type { SessionPersistence } from "./SessionPersistence";
import type { SessionHydration } from "./SessionHydration";
import { recordTurn } from "./recordTurn";
import { recordSubagentTurn } from "./recordSubagentTurn";
import { removeTurn } from "./removeTurn";
import { setSessionStatus } from "./setSessionStatus";
import { warmCallbacks } from "./warmCallbacks";

/** Starts, attaches and pre-warms ACP agent connections for sessions. */
export class SessionAgents {
  constructor(
    private readonly state: SessionState,
    private readonly persistence: SessionPersistence,
    private readonly hydration: SessionHydration,
  ) {}

  /** Return a connected agent for the session, attaching or starting one if needed. */
  async ensureSession(session: Session, options?: { quiet?: boolean }): Promise<AcpSession> {
    const { state } = this;
    if (!(await this.hydration.ensure(session.id))) throw new Error("No session");
    let acp = state.agents.get(session.id);
    if (!acp) {
      acp = this.openSession(session);
      state.agents.set(session.id, acp);
    }
    if (acp.sessionId) return acp;
    session.slashCommands = undefined;
    state.emitSessions();
    const priorAgentSessionId = session.agentSessionId;
    if (session.agentSessionId) await acp.attachExisting(session.agentSessionId, options);
    else await acp.start();
    session.agentSessionId = acp.sessionId;
    state.emitSessions();
    if (session.agentSessionId !== priorAgentSessionId) this.persistence.queuePersist();
    return acp;
  }

  openSession(session: Session): AcpSession {
    const acp = new AcpSession(session.id, session.agent, session.cwd, this.callbacksFor(session));
    const turns = this.state.transcripts.get(session.id);
    if (turns?.length) acp.restoreTurns(turns);
    return acp;
  }

  ensureWarm(agent: AgentKind, cwd: string): void {
    const callbacks: SessionCallbacks = {
      ...warmCallbacks,
      onForkSupport: (supported) => this.noteForkSupport(agent, supported),
    };
    this.state.warm.ensure(
      agent,
      cwd,
      () => new AcpSession(newSessionId(), agent, cwd, callbacks),
    );
  }

  refreshCommandsIfNeeded(sessionId: string): void {
    const session = this.state.sessions.get(sessionId);
    if (!session || !session.agentSessionId) return;
    void this.refreshCommands(session).catch(() => undefined);
  }

  callbacksFor(session: Session): SessionCallbacks {
    const { state, persistence } = this;
    return buildSessionCallbacks({
      session,
      send: (channel, payload) => state.send(channel, payload),
      handleTurn: (sessionId, turn) => recordTurn(state, sessionId, turn),
      handleSubagentTurn: (sessionId, subagentId, turn) =>
        recordSubagentTurn(state, sessionId, subagentId, turn),
      removeTurn: (sessionId, turnId) => removeTurn(state, sessionId, turnId),
      setStatus: (sessionId, status, error) => setSessionStatus(state, sessionId, status, error),
      emitSessions: () => state.emitSessions(),
      noteForkSupport: (agent, supported) => this.noteForkSupport(agent, supported),
      queuePersist: () => persistence.queuePersist(),
      permissionOwners: state.permissionOwners,
      askOwners: state.askOwners,
    });
  }

  private noteForkSupport(agent: AgentKind, supported: boolean): void {
    if (this.state.forkSupport.record(agent, supported)) this.state.emitSessions();
  }

  private async refreshCommands(session: Session): Promise<void> {
    try {
      await Promise.race([
        this.ensureSession(session, { quiet: true }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Timed out refreshing slash commands")), 45_000);
        }),
      ]);
    } catch (error) {
      const acp = this.state.agents.get(session.id);
      if (acp && !acp.sessionId) {
        this.state.agents.delete(session.id);
        await acp.dispose().catch(() => undefined);
      }
      throw error;
    }
  }
}
