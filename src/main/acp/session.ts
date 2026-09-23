import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { Readable, Writable } from "node:stream";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as acp from "@agentclientprotocol/sdk";
import type {
  AgentKind,
  MasterEvent,
  TranscriptItem,
} from "../../shared/types";
import { AGENT_PRESETS, agentLabel } from "./presets";
import type { GlobalEventBus } from "../events";
import { SessionOutput } from "./SessionOutput";
import type { SessionCallbacks } from "./SessionCallbacks";
import { PromptQueue } from "./PromptQueue";
import { PromptDelivery } from "./PromptDelivery";

type PermissionResolver = (optionId: string | "cancelled") => void;
type AskQuestionResolver = (outcome: unknown) => void;


export class AcpSession {
  readonly tabId: string;
  readonly agentKind: AgentKind;
  readonly cwd: string;
  sessionId: string | null = null;

  private proc: ChildProcessWithoutNullStreams | null = null;
  private connection: acp.ClientConnection | null = null;
  private turnRunning = false;
  private remoteTurnActive: boolean | null = null;
  private bus: GlobalEventBus;
  private cb: SessionCallbacks;
  private pendingPermissions = new Map<string, PermissionResolver>();
  private pendingAsk = new Map<string, AskQuestionResolver>();
  private output: SessionOutput;
  private disposed = false;
  private starting: Promise<void> | null = null;
  private prompts = new PromptQueue((text) => this.runPrompt(text));
  private delivery = new PromptDelivery({
    isRunning: () => this.turnRunning,
    prompt: (text) => this.prompts.send(text),
    steer: (text) => {
      if (!this.connection || !this.sessionId || this.disposed) throw new Error("Session closed");
      return this.connection.agent.request("_session/steering", {
        sessionId: this.sessionId,
        prompt: [{ type: "text", text }],
        _meta: { steering: { idleBehavior: "promptRequired" } },
      });
    },
    onSupport: (supported) => this.cb.onSteeringSupport(supported),
    onDetachedTurn: () => {
      if (this.remoteTurnActive !== false) {
        this.turnRunning = true;
        this.cb.onStatus("running");
      }
    },
  });

  constructor(
    tabId: string,
    agentKind: AgentKind,
    cwd: string,
    bus: GlobalEventBus,
    cb: SessionCallbacks,
  ) {
    this.tabId = tabId;
    this.agentKind = agentKind;
    this.cwd = cwd;
    this.bus = bus;
    this.cb = cb;
    this.output = new SessionOutput(agentKind, bus, cb.onTranscript, (kind, text, id) => this.pushMaster(kind, text, id));
  }

  start(): Promise<void> {
    if (this.sessionId) return Promise.resolve();
    if (!this.starting) {
      this.starting = this.startSession().finally(() => { this.starting = null; });
    }
    return this.starting;
  }

  private async startSession(): Promise<void> {
    this.cb.onStatus("connecting");
    const preset = AGENT_PRESETS[this.agentKind];

    this.proc = spawn(preset.command, preset.args, {
      cwd: this.cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, HOME: process.env.HOME },
      shell: false,
    });

    this.proc.stderr.on("data", (buf: Buffer) => {
      const line = buf.toString();
      if (line.trim()) console.error(`[acp:${this.agentKind}]`, line.trim());
    });

    this.proc.on("exit", (code) => {
      if (!this.disposed) {
        this.cb.onStatus("error", `Agent exited (code ${code ?? "?"})`);
      }
    });

    const input = Writable.toWeb(this.proc.stdin) as WritableStream<Uint8Array>;
    const output = Readable.toWeb(this.proc.stdout) as ReadableStream<Uint8Array>;
    const stream = acp.ndJsonStream(input, output);

    this.connection = acp
      .client({ name: "switcheroo" })
      .onRequest(acp.methods.client.session.requestPermission, async (ctx) => {
        return this.handlePermission(ctx.params);
      })
      .onRequest(acp.methods.client.fs.readTextFile, async (ctx) => {
        return this.readTextFile(ctx.params);
      })
      .onRequest(acp.methods.client.fs.writeTextFile, async (ctx) => {
        return this.writeTextFile(ctx.params);
      })
      .onRequest("cursor/ask_question", (params: unknown) => params as Record<string, unknown>, async (ctx) => {
        return this.handleAskQuestion(ctx.params);
      })
      .onNotification("cursor/update_todos", (params: unknown) => params, async () => {
        this.pushMaster("plan", "Todos updated");
      })
      .onNotification(acp.methods.client.session.update, (ctx) => {
        if (ctx.params.sessionId !== this.sessionId || this.disposed) return;
        this.output.handleUpdate(ctx.params.update);
        const codex = ctx.params.update._meta?.codex;
        const status = codex && typeof codex === "object" && "threadStatus" in codex
          ? codex.threadStatus : null;
        if (status && typeof status === "object" && "type" in status) {
          if (status.type === "active" || status.type === "idle" || status.type === "systemError") {
            this.remoteTurnActive = status.type === "active";
            this.turnRunning = this.remoteTurnActive;
            this.cb.onStatus(status.type === "active" ? "running" : status.type === "idle" ? "ready" : "error");
          }
        }
      })
      .connect(stream);

    const agent = this.connection.agent;

    const initialized = await agent.request(acp.methods.agent.initialize, {
      protocolVersion: acp.PROTOCOL_VERSION,
      clientCapabilities: {
        fs: { readTextFile: true, writeTextFile: true },
        terminal: false,
      },
      clientInfo: { name: "switcheroo", version: "1.0.0" },
    });
    this.delivery.configure(initialized._meta);

    if (preset.authMethodId) {
      try {
        await agent.request(acp.methods.agent.authenticate, {
          methodId: preset.authMethodId,
        });
      } catch (err) {
        console.error("[acp] authenticate failed", err);
        // Continue — some agents are already logged in via CLI
      }
    }

    const session = await agent.request(acp.methods.agent.session.new, { cwd: this.cwd, mcpServers: [] });
    this.sessionId = session.sessionId;
    this.cb.onStatus("ready");
    this.pushMaster("status", `${agentLabel(this.agentKind)} session ready`);
  }

  async prompt(text: string): Promise<void> {
    if (!this.sessionId || this.disposed) throw new Error("Session not ready");
    const userItem: TranscriptItem = {
      id: randomUUID(),
      role: "user",
      text,
      at: Date.now(),
    };
    this.emitTranscript(userItem);
    this.pushMaster("user", text, userItem.id);
    await this.delivery.send(text);
  }

  private async runPrompt(text: string): Promise<void> {
    if (!this.connection || !this.sessionId || this.disposed) throw new Error("Session not ready");
    this.turnRunning = true;
    this.remoteTurnActive = null;
    this.cb.onStatus("running");
    this.output.reset();

    try {
      const response = await this.connection.agent.request(acp.methods.agent.session.prompt, {
        sessionId: this.sessionId,
        prompt: [{ type: "text", text }],
      });
      this.pushMaster("status", `Turn ended (${response.stopReason})`);
      if (this.remoteTurnActive !== true && !this.disposed) {
        this.turnRunning = false;
        this.cb.onStatus("ready");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (this.remoteTurnActive !== true && !this.disposed) {
        this.turnRunning = false;
        this.cb.onStatus("error", msg);
      }
      this.pushMaster("error", msg);
      throw err;
    }
  }

  async cancel(): Promise<void> {
    if (!this.connection || !this.sessionId) return;
    try {
      await this.connection.agent.notify(acp.methods.agent.session.cancel, {
        sessionId: this.sessionId,
      });
    } catch {
      /* ignore */
    }
  }

  respondPermission(requestId: string, optionId: string | "cancelled"): void {
    const resolve = this.pendingPermissions.get(requestId);
    if (resolve) {
      this.pendingPermissions.delete(requestId);
      resolve(optionId);
    }
  }

  respondAskQuestion(requestId: string, outcome: unknown): void {
    const resolve = this.pendingAsk.get(requestId);
    if (resolve) {
      this.pendingAsk.delete(requestId);
      resolve(outcome);
    }
  }

  private async handlePermission(
    params: acp.RequestPermissionRequest,
  ): Promise<acp.RequestPermissionResponse> {
    const requestId = randomUUID();
    this.pushMaster("permission", params.toolCall?.title ?? "Permission requested");
    this.cb.onPermission({
      requestId,
      tabId: this.tabId,
      toolCallTitle: params.toolCall?.title ?? "Permission requested",
      options: (params.options ?? []).map((o) => ({
        optionId: o.optionId,
        name: o.name,
        kind: o.kind,
      })),
    });

    const optionId = await new Promise<string | "cancelled">((resolve) => {
      this.pendingPermissions.set(requestId, resolve);
    });

    if (optionId === "cancelled") {
      return { outcome: { outcome: "cancelled" } };
    }
    return { outcome: { outcome: "selected", optionId } };
  }

  private async handleAskQuestion(
    params: Record<string, unknown>,
  ): Promise<unknown> {
    const requestId = randomUUID();
    this.pushMaster("permission", "Question from agent");
    this.cb.onAskQuestion({
      requestId,
      tabId: this.tabId,
      toolCallId: String(params.toolCallId ?? ""),
      title: params.title as string | undefined,
      questions: (params.questions as CursorAskQuestionRequestQuestions) ?? [],
    });
    return new Promise((resolve) => {
      this.pendingAsk.set(requestId, resolve);
    });
  }

  private async readTextFile(
    params: acp.ReadTextFileRequest,
  ): Promise<acp.ReadTextFileResponse> {
    const filePath = this.resolvePath(params.path);
    const content = await fs.readFile(filePath, "utf8");
    return { content };
  }

  private async writeTextFile(
    params: acp.WriteTextFileRequest,
  ): Promise<acp.WriteTextFileResponse> {
    const filePath = this.resolvePath(params.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, params.content, "utf8");
    return {};
  }

  resolvePath(p: string): string {
    const resolved = path.isAbsolute(p) ? path.normalize(p) : path.resolve(this.cwd, p);
    const root = path.resolve(this.cwd);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      throw new Error("Path escapes workspace");
    }
    return resolved;
  }

  private emitTranscript(item: TranscriptItem): void {
    this.cb.onTranscript(item);
  }

  private pushMaster(
    kind: MasterEvent["kind"],
    summary: string,
    id?: string,
  ): void {
    if (this.disposed) return;
    this.bus.append({
      id: id ?? randomUUID(),
      tabId: this.tabId,
      agentKind: this.agentKind,
      at: Date.now(),
      kind,
      summary,
      navigable: true,
    });
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    this.prompts.dispose();
    this.connection?.close();
    if (this.proc && !this.proc.killed) {
      this.proc.kill();
    }
    this.proc = null;
    this.sessionId = null;
    this.connection = null;
  }
}

type CursorAskQuestionRequestQuestions = Array<{
  id: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  allowMultiple?: boolean;
}>;
