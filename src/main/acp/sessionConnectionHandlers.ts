import { answerPermission } from "./answerPermission";
import type { ConnectHandlers } from "./connectAcpAgent";
import type { PendingQuestions } from "./PendingQuestions";
import type { PromptRunner } from "./PromptRunner";
import type { SessionCallbacks } from "./SessionCallbacks";
import type { SessionFiles } from "./SessionFiles";
import type { SessionUpdateRouter } from "./SessionUpdateRouter";

type SessionConnectionHost = {
  /** Read on every call: adopting a warm session rebinds its callbacks. */
  callbacks: () => SessionCallbacks;
  files: SessionFiles;
  questions: PendingQuestions;
  runner: PromptRunner;
  isDisposed: () => boolean;
  noteSystem: (text: string) => void;
  finishPending: (status: string) => void;
  closeConnection: () => void;
  routerFor: (sessionId: string) => SessionUpdateRouter | null;
};

/** How an AcpSession responds to its agent connection: requests, updates, and disconnects. */
export function sessionConnectionHandlers({
  callbacks,
  files,
  questions,
  runner,
  isDisposed,
  noteSystem,
  finishPending,
  closeConnection,
  routerFor,
}: SessionConnectionHost): Omit<ConnectHandlers, "agent" | "cwd" | "mcpServers" | "quiet"> {
  return {
    isDisposed,
    onStatus: (status, message) => {
      if (status === "connecting") callbacks().onStatus("connecting");
      else callbacks().onStatus("error", message);
    },
    onPermission: async (params) => {
      const { note, response } = answerPermission(params);
      noteSystem(note);
      return response;
    },
    onReadFile: (params) => files.read(params),
    onWriteFile: (params) => files.write(params),
    onAskQuestion: async (params, signal) => {
      if (isDisposed() || runner.stopRequested) return { outcome: "cancelled" };
      noteSystem("Question from agent");
      return questions.request(params, signal);
    },
    onTodosUpdated: () => noteSystem("Todos updated"),
    onSessionUpdate: (sessionId, update) => routerFor(sessionId)?.update(sessionId, update),
    onSubagentUpdate: (sessionId, update) => routerFor(sessionId)?.lifecycle(sessionId, update),
    onProcessExit: (code) => {
      finishPending("interrupted");
      closeConnection();
      callbacks().onStatus("error", `Agent exited (code ${code ?? "?"})`);
    },
    onConnectionAbort: () => {
      finishPending("interrupted");
      if (!isDisposed()) callbacks().onStatus("error", "Agent connection closed");
    },
    onForkSupport: (supported) => callbacks().onForkSupport(supported),
    configureDelivery: (meta) => runner.configureDelivery(meta),
  };
}
