import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { Readable, Writable } from "node:stream";
import * as acp from "@agentclientprotocol/sdk/unstable";
import type { AgentKind } from "../../shared/agentKind";
import { errorMessage } from "../../shared/errorMessage";
import { AGENT_PRESETS } from "./presets";
import { spawnAgentProcess } from "./spawnAgentProcess";
import { drainAgentStream } from "./drainAgentStream";
import { piMcpEnv } from "./piMcpEnv";
import { shellEnv } from "../shellEnv/shellEnv";
import { parseSubagentNotification } from "./subagents/parseSubagentNotification";
import { rewriteSubagentUpdates } from "./subagents/rewriteSubagentUpdates";
import type { SubagentUpdate } from "./subagents/SubagentUpdate";
import { SUBAGENT_UPDATE_METHOD } from "./subagents/subagentUpdateMethod";

type ConnectAcpResult = {
  proc: ChildProcessWithoutNullStreams;
  connection: acp.ClientConnection;
  canLoad: boolean;
  canResume: boolean;
  initializationMeta: unknown;
};

export type ConnectHandlers = {
  agent: AgentKind;
  cwd: string;
  /** The session's MCP servers; Pi reads them from its process environment. */
  mcpServers: acp.McpServer[];
  quiet?: boolean;
  isDisposed: () => boolean;
  onStatus: (status: "connecting" | "error", message?: string) => void;
  onPermission: (params: acp.RequestPermissionRequest) => Promise<acp.RequestPermissionResponse>;
  onAskQuestion: (
    params: unknown,
    signal: AbortSignal,
  ) => Promise<{ outcome: string } | Record<string, unknown>>;
  onTodosUpdated: () => void;
  onSessionUpdate: (sessionId: string, update: acp.SessionUpdate) => void;
  /** Draft ACP subagent lifecycle, sent on the session that started the subagent. */
  onSubagentUpdate: (sessionId: string, update: SubagentUpdate) => void;
  onProcessExit: (code: number | null) => void;
  onConnectionAbort: () => void;
  onForkSupport: (supported: boolean) => void;
  configureDelivery: (meta: unknown) => void;
};

/** Spawn the agent process, open an ACP client connection, and initialize. */
export async function connectAcpAgent(handlers: ConnectHandlers): Promise<ConnectAcpResult> {
  if (!handlers.quiet) handlers.onStatus("connecting");
  const preset = AGENT_PRESETS[handlers.agent];

  let proc: ChildProcessWithoutNullStreams;
  try {
    // Presets look up CLIs on the shell's PATH, so wait for it before reading them.
    const base = await shellEnv.get();
    const env = { ...base, ...preset.env, ...piMcpEnv(handlers.agent, handlers.mcpServers) };
    proc = await spawnAgentProcess(preset.command, preset.args, handlers.cwd, env);
  } catch (err) {
    const message = errorMessage(err);
    if (!handlers.isDisposed()) handlers.onStatus("error", message);
    throw new Error(message);
  }

  drainAgentStream(proc.stderr);

  proc.on("exit", (code) => {
    if (!handlers.isDisposed()) handlers.onProcessExit(code);
  });

  const input = Writable.toWeb(proc.stdin) as WritableStream<Uint8Array>;
  const output = Readable.toWeb(proc.stdout) as ReadableStream<Uint8Array>;
  const stream = rewriteSubagentUpdates(acp.ndJsonStream(input, output));

  const connection = acp
    .client({ name: "switcheroo" })
    .onRequest(acp.methods.client.session.requestPermission, async (ctx) => {
      return handlers.onPermission(ctx.params);
    })
    .onRequest("cursor/ask_question", (params: unknown) => params as Record<string, unknown>, async (ctx) => {
      return handlers.onAskQuestion(ctx.params, ctx.signal);
    })
    .onNotification("cursor/update_todos", (params: unknown) => params, async () => {
      handlers.onTodosUpdated();
    })
    .onNotification(acp.methods.client.session.update, (ctx) => {
      handlers.onSessionUpdate(ctx.params.sessionId, ctx.params.update);
    })
    .onNotification(SUBAGENT_UPDATE_METHOD, parseSubagentNotification, (ctx) => {
      if (ctx.params) handlers.onSubagentUpdate(ctx.params.sessionId, ctx.params.update);
    })
    .connect(stream);

  connection.signal?.addEventListener("abort", () => {
    handlers.onConnectionAbort();
  }, { once: true });

  const agent = connection.agent;
  const initialized = await agent.request(acp.methods.agent.initialize, {
    protocolVersion: acp.PROTOCOL_VERSION,
    clientCapabilities: {
      // No adapter routes its file tools through the client; agents read and write files themselves.
      fs: { readTextFile: false, writeTextFile: false },
      terminal: false,
      ...(preset.clientCapabilityMeta ? { _meta: preset.clientCapabilityMeta } : {}),
    },
    clientInfo: { name: "switcheroo", version: "1.0.0" },
  });
  const caps = initialized.agentCapabilities;
  const canLoad = caps?.loadSession === true;
  const canResume = caps?.sessionCapabilities?.resume != null;
  handlers.onForkSupport(caps?.sessionCapabilities?.fork != null);
  const initializationMeta = initialized._meta;
  handlers.configureDelivery(initializationMeta);

  if (preset.authMethodId) {
    try {
      await agent.request(acp.methods.agent.authenticate, {
        methodId: preset.authMethodId,
      });
    } catch {
      // Auth is optional for some agents; avoid console.error (EPIPE under Electron).
    }
  }

  return { proc, connection, canLoad, canResume, initializationMeta };
}
