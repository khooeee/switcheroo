import type { Session, SessionStatus } from "../../shared/session";
import type { TranscriptTurn } from "../../shared/transcript";
import type { SessionCallbacks } from "../acp/SessionCallbacks";
import type { AgentKind } from "../../shared/agentKind";
import { sessionTitleWithPrefix } from "../../shared/sessionTitleWithPrefix";
import type { SessionObserver } from "./SessionObserver";

type CallbackDeps = {
  session: Session;
  send: (channel: string, payload: unknown) => void;
  handleTurn: (sessionId: string, turn: TranscriptTurn) => void;
  handleSubagentTurn: (sessionId: string, subagentId: string, turn: TranscriptTurn) => void;
  removeTurn: (sessionId: string, turnId: string) => void;
  setStatus: (sessionId: string, status: SessionStatus, error: string | null) => void;
  emitSessions: () => void;
  noteForkSupport: (agent: AgentKind, supported: boolean) => void;
  queuePersist: () => void;
  askOwners: Map<string, string>;
  observer: () => SessionObserver | null;
};

/** Wire AcpSession callbacks into SessionManager maps + IPC. */
export function buildSessionCallbacks(deps: CallbackDeps): SessionCallbacks {
  const { session } = deps;
  return {
    onPromptComplete: () => {
      const announced = deps.observer()?.promptComplete(session.id) ?? false;
      deps.send("prompt:complete", { sessionId: session.id, announced });
    },
    onTurn: (turn) => deps.handleTurn(session.id, turn),
    onSubagentTurn: (subagentId, turn) => deps.handleSubagentTurn(session.id, subagentId, turn),
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
    onModelConfig: (config) => {
      session.modelConfig = config;
      deps.emitSessions();
      deps.queuePersist();
    },
    onTitle: (title) => {
      if (!session.autoTitle) return;
      session.title = sessionTitleWithPrefix(session.autoTitle.prefix, title);
      deps.emitSessions();
      deps.queuePersist();
    },
    onAvailableCommands: (commands) => {
      session.slashCommands = commands;
      deps.emitSessions();
    },
    onQuestionSettled: (requestId) => {
      deps.askOwners.delete(requestId);
      deps.send("question:settled", { requestId });
      deps.observer()?.questionSettled(requestId);
    },
    onAskQuestion: (req) => {
      deps.askOwners.set(req.requestId, session.id);
      deps.send("ask-question", req);
      deps.observer()?.askQuestion(req);
    },
    getSessionTitle: () => session.title,
  };
}
