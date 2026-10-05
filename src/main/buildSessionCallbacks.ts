import type { Session, SessionStatus } from "../shared/session";
import type { TranscriptTurn } from "../shared/transcript";
import type { SessionCallbacks } from "./acp/SessionCallbacks";
import type { AgentKind } from "../shared/agentKind";

type CallbackDeps = {
  session: Session;
  send: (channel: string, payload: unknown) => void;
  handleTurn: (sessionId: string, turn: TranscriptTurn) => void;
  removeTurn: (sessionId: string, turnId: string) => void;
  setStatus: (sessionId: string, status: SessionStatus, error: string | null) => void;
  emitSessions: () => void;
  noteForkSupport: (agent: AgentKind, supported: boolean) => void;
  queuePersist: () => void;
  permissionOwners: Map<string, string>;
  askOwners: Map<string, string>;
};

/** Wire AcpSession callbacks into SessionManager maps + IPC. */
export function buildSessionCallbacks(deps: CallbackDeps): SessionCallbacks {
  const { session } = deps;
  return {
    onPromptComplete: () => {
      deps.send("prompt:complete", { sessionId: session.id });
    },
    onTurn: (turn) => deps.handleTurn(session.id, turn),
    onTurnRemoved: (turnId) => deps.removeTurn(session.id, turnId),
    onStatus: (status, error) => deps.setStatus(session.id, status, error ?? null),
    onSteeringSupport: (supported) => {
      session.supportsSteering = supported;
      deps.emitSessions();
    },
    onForkSupport: (supported) => deps.noteForkSupport(session.agent, supported),
    onUsage: (usage) => {
      session.usage = usage;
      deps.emitSessions();
      deps.queuePersist();
    },
    onAvailableCommands: (commands) => {
      session.slashCommands = commands;
      deps.emitSessions();
    },
    onPermission: (req) => {
      deps.permissionOwners.set(req.requestId, session.id);
      deps.send("permission", req);
    },
    onQuestionSettled: (requestId) => {
      deps.askOwners.delete(requestId);
      deps.send("question:settled", { requestId });
    },
    onAskQuestion: (req) => {
      deps.askOwners.set(req.requestId, session.id);
      deps.send("ask-question", req);
    },
    getSessionTitle: () => session.title,
  };
}
