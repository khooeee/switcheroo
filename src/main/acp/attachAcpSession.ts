import * as acp from "@agentclientprotocol/sdk";
import { formatAgentError } from "../../shared/formatAgentError";

type AttachHost = {
  connection: acp.ClientConnection | null;
  canLoad: boolean;
  canResume: boolean;
  cwd: string;
  turnCount: () => number;
  setMirrorUpdates: (value: boolean) => void;
  /** No turn running; remote turn status unknown. */
  markIdle: () => void;
  setSessionId: (sessionId: string) => void;
  clearSessionId: () => void;
  resetOutput: () => void;
  onReady: () => void;
  createAgentSession: () => Promise<void>;
};

/** Resume/load an existing agent session, or mint a fresh one when hollow. */
export async function attachAcpSession(
  host: AttachHost,
  sessionId: string,
): Promise<void> {
  if (!host.connection) throw new Error("Session closed");
  // Never-prompted sessions often have an agent id / session-env but no
  // transcript. Resuming them yields a hollow session that completes with no
  // assistant text. Mint a fresh agent session instead.
  if (host.turnCount() === 0) {
    host.setMirrorUpdates(false);
    await host.createAgentSession();
    return;
  }
  const params = { sessionId, cwd: host.cwd, mcpServers: [] as [] };
  // Prefer load: older agents (incl. Cursor) advertise loadSession, not session/resume.
  const methods: Array<typeof acp.methods.agent.session.load | typeof acp.methods.agent.session.resume> = [];
  if (host.canLoad) methods.push(acp.methods.agent.session.load);
  if (host.canResume) methods.push(acp.methods.agent.session.resume);
  if (methods.length === 0) {
    methods.push(acp.methods.agent.session.load, acp.methods.agent.session.resume);
  }
  const errors: string[] = [];
  for (const method of methods) {
    try {
      host.setSessionId(sessionId);
      // load/resume often replays history as session updates — keep those off the
      // transcript until the next prompt (replay can arrive after the RPC returns).
      host.setMirrorUpdates(false);
      host.markIdle();
      const response = await host.connection.agent.request(method, params) as {
        sessionId?: string;
      } | void;
      const resumedId =
        response && typeof response === "object" && typeof response.sessionId === "string"
          ? response.sessionId
          : sessionId;
      host.setSessionId(resumedId);
      // Replay may have flipped turnRunning via status updates; we are idle until the next prompt.
      host.markIdle();
      host.resetOutput();
      host.onReady();
      return;
    } catch (err) {
      host.clearSessionId();
      host.markIdle();
      errors.push(formatAgentError(err));
    }
  }
  const detail = errors.join("; ");
  // Empty / never-prompted agent sessions often fail load/resume (Cursor: not found;
  // Codex: no rollout for the thread id). Reuse this connection and mint a fresh one.
  if (/invalid params|not found|no conversation|no rollout/i.test(detail)) {
    host.setMirrorUpdates(false);
    await host.createAgentSession();
    return;
  }
  throw new Error(
    `Could not reopen session (${detail}). Send a message in this session to reconnect, then fork.`,
  );
}
