import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { Readable, Writable } from "node:stream";
import * as acp from "@agentclientprotocol/sdk";
import type { AgentKind } from "../../shared/agentKind";
import { AGENT_PRESETS } from "./presets";
import { spawnAgentProcess } from "./spawnAgentProcess";
import { drainAgentStream } from "./drainAgentStream";

type ConnectAcpResult = {
  proc: ChildProcessWithoutNullStreams;
  connection: acp.ClientConnection;
  canLoad: boolean;
  canResume: boolean;
  initializationMeta: unknown;
};

type ConnectHandlers = {
  agent: AgentKind;
  cwd: string;
  quiet?: boolean;
  isDisposed: () => boolean;
  onStatus: (status: "connecting" | "error", message?: string) => void;
  onPermission: (params: acp.RequestPermissionRequest) => Promise<acp.RequestPermissionResponse>;
  onReadFile: (params: acp.ReadTextFileRequest) => Promise<acp.ReadTextFileResponse>;
  onWriteFile: (params: acp.WriteTextFileRequest) => Promise<acp.WriteTextFileResponse>;
  onAskQuestion: (
    params: unknown,
    signal: AbortSignal,
  ) => Promise<{ outcome: string } | Record<string, unknown>>;
  onTodosUpdated: () => void;
  onSessionUpdate: (sessionId: string, update: acp.SessionUpdate) => void;
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
    proc = await spawnAgentProcess(preset.command, preset.args, handlers.cwd);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!handlers.isDisposed()) handlers.onStatus("error", message);
    throw new Error(message);
  }

  drainAgentStream(proc.stderr);

  proc.on("exit", (code) => {
    if (!handlers.isDisposed()) handlers.onProcessExit(code);
  });

  const input = Writable.toWeb(proc.stdin) as WritableStream<Uint8Array>;
  const output = Readable.toWeb(proc.stdout) as ReadableStream<Uint8Array>;
  const stream = acp.ndJsonStream(input, output);

  const connection = acp
    .client({ name: "switcheroo" })
    .onRequest(acp.methods.client.session.requestPermission, async (ctx) => {
      return handlers.onPermission(ctx.params);
    })
    .onRequest(acp.methods.client.fs.readTextFile, async (ctx) => {
      return handlers.onReadFile(ctx.params);
    })
    .onRequest(acp.methods.client.fs.writeTextFile, async (ctx) => {
      return handlers.onWriteFile(ctx.params);
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
    .connect(stream);

  connection.signal?.addEventListener("abort", () => {
    handlers.onConnectionAbort();
  }, { once: true });

  const agent = connection.agent;
  const initialized = await agent.request(acp.methods.agent.initialize, {
    protocolVersion: acp.PROTOCOL_VERSION,
    clientCapabilities: {
      fs: { readTextFile: true, writeTextFile: true },
      terminal: false,
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
