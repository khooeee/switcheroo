import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { Readable, Writable } from "node:stream";
import { randomUUID } from "node:crypto";
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
import { PromptCompletion } from "./PromptCompletion";
import { PromptQueue } from "./PromptQueue";
import { PromptDelivery } from "./PromptDelivery";
import { autoApprovePermission } from "./autoApprovePermission";
import { SessionFiles } from "./SessionFiles";
import { PendingQuestions } from "./PendingQuestions";
import { forkAcpSession } from "./forkAcpSession";
import { registerSessionRoute, unregisterSessionRoute, sessionForUpdate } from "./sessionRoutes";

export class AcpSession {
  readonly tabId: string;
  readonly agentKind: AgentKind;
  readonly cwd: string;
  sessionId: string | null = null;

  private proc: ChildProcessWithoutNullStreams | null = null;
  private connection: acp.ClientConnection | null = null;
  private connectionOwner: AcpSession | null = null;
  private connectionUsers = 1;
  private turnRunning = false;
  private stopRequested = false;
  private remoteTurnActive: boolean | null = null;
  private canLoad = false;
  private canResume = false;
  private bus: GlobalEventBus;
  private cb: SessionCallbacks;
  private questions: PendingQuestions;
  private files: SessionFiles;
  private output: SessionOutput;
  private disposed = false;
  private starting: Promise<void> | null = null;
  private completion = new PromptCompletion(() => this.cb.onPromptComplete());
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
      this.completion.detached();
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
    this.files = new SessionFiles(cwd);
    this.questions = new PendingQuestions(tabId, cb.onAskQuestion, (id) => cb.onQuestionSettled?.(id));
    this.output = new SessionOutput(agentKind, bus, cb.onTranscript, (kind, text, id) => this.pushMaster(kind, text, id));
  }

  start(): Promise<void> {
    if (this.sessionId) return Promise.resolve();
    if (!this.starting) {
      this.starting = this.startSession().finally(() => { this.starting = null; });
    }
    return this.starting;
  }

  /** Reopen a persisted session via resume, then load. */
  attachExisting(sessionId: string): Promise<void> {
    if (this.sessionId) return Promise.resolve();
    if (!this.starting) {
      this.starting = this.attachSession(sessionId).finally(() => { this.starting = null; });
    }
    return this.starting;
  }

  private async startSession(): Promise<void> {
    await this.connectAgent();
    if (!this.connection) throw new Error("Session closed");
    const session = await this.connection.agent.request(acp.methods.agent.session.new, {
      cwd: this.cwd,
      mcpServers: [],
    });
    this.setSessionId(session.sessionId);
    this.cb.onStatus("ready");
    this.pushMaster("status", `${agentLabel(this.agentKind)} session ready`);
  }

  private async attachSession(sessionId: string): Promise<void> {
    await this.connectAgent();
    if (!this.connection) throw new Error("Session closed");
    const params = { sessionId, cwd: this.cwd, mcpServers: [] as [] };
    // Prefer load: older agents (incl. Cursor) advertise loadSession, not session/resume.
    const methods: Array<typeof acp.methods.agent.session.load | typeof acp.methods.agent.session.resume> = [];
    if (this.canLoad) methods.push(acp.methods.agent.session.load);
    if (this.canResume) methods.push(acp.methods.agent.session.resume);
    if (methods.length === 0) {
      methods.push(acp.methods.agent.session.load, acp.methods.agent.session.resume);
    }
    const errors: string[] = [];
    for (const method of methods) {
      try {
        this.setSessionId(sessionId);
        await this.connection.agent.request(method, params);
        this.cb.onStatus("ready");
        this.pushMaster("status", `${agentLabel(this.agentKind)} session attached`);
        return;
      } catch (err) {
        this.clearSessionId();
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
    throw new Error(
      `Could not reopen session (${errors.join("; ")}). Send a message in this tab to reconnect, then fork.`,
    );
  }

  async fork(atMessageId?: string): Promise<string> {
    if (!this.connection || !this.sessionId || this.disposed) {
      throw new Error("Session not ready to fork");
    }
    return forkAcpSession(this.connection, this.sessionId, this.cwd, atMessageId);
  }

  /** Fork on this connection and return a sibling session sharing the agent process. */
  async forkSibling(
    tabId: string,
    bus: GlobalEventBus,
    cb: SessionCallbacks,
    atMessageId?: string,
  ): Promise<AcpSession> {
    const forkedId = await this.fork(atMessageId);
    const owner = this.connectionOwner ?? this;
    const child = new AcpSession(tabId, this.agentKind, this.cwd, bus, cb);
    child.connection = this.connection;
    child.proc = null;
    child.connectionOwner = owner;
    owner.connectionUsers += 1;
    child.setSessionId(forkedId);
    child.cb.onStatus("ready");
    return child;
  }

  private setSessionId(sessionId: string): void {
    this.clearSessionId();
    this.sessionId = sessionId;
    registerSessionRoute(sessionId, this);
  }

  private clearSessionId(): void {
    unregisterSessionRoute(this.sessionId);
    this.sessionId = null;
  }

  private async connectAgent(): Promise<void> {
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
        this.finishPending("interrupted");
        this.connection?.close();
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
        return this.files.read(ctx.params);
      })
      .onRequest(acp.methods.client.fs.writeTextFile, async (ctx) => {
        return this.files.write(ctx.params);
      })
      .onRequest("cursor/ask_question", (params: unknown) => params as Record<string, unknown>, async (ctx) => {
        if (this.disposed || this.stopRequested) return { outcome: "cancelled" };
        this.pushMaster("permission", "Question from agent");
        return this.questions.request(ctx.params, ctx.signal);
      })
      .onNotification("cursor/update_todos", (params: unknown) => params, async () => {
        this.pushMaster("plan", "Todos updated");
      })
      .onNotification(acp.methods.client.session.update, (ctx) => {
        const target = sessionForUpdate(ctx.params.sessionId, this);
        if (target.disposed) return;
        target.handleSessionUpdate(ctx.params.update);
      })
      .connect(stream);

    this.connection.signal?.addEventListener("abort", () => {
      this.finishPending("interrupted");
      if (!this.disposed) this.cb.onStatus("error", "Agent connection closed");
    }, { once: true });

    const agent = this.connection.agent;
    const initialized = await agent.request(acp.methods.agent.initialize, {
      protocolVersion: acp.PROTOCOL_VERSION,
      clientCapabilities: {
        fs: { readTextFile: true, writeTextFile: true },
        terminal: false,
      },
      clientInfo: { name: "switcheroo", version: "1.0.0" },
    });
    const caps = initialized.agentCapabilities;
    this.canLoad = caps?.loadSession === true;
    this.canResume = caps?.sessionCapabilities?.resume != null;
    this.delivery.configure(initialized._meta);

    if (preset.authMethodId) {
      try {
        await agent.request(acp.methods.agent.authenticate, {
          methodId: preset.authMethodId,
        });
      } catch (err) {
        console.error("[acp] authenticate failed", err);
      }
    }
  }

  private handleSessionUpdate(update: acp.SessionUpdate): void {
    if (update.sessionUpdate === "available_commands_update") {
      this.cb.onAvailableCommands(
        update.availableCommands.map((command) => ({
          name: command.name,
          description: command.description,
          hint: command.input && "hint" in command.input ? command.input.hint : undefined,
        })),
      );
      return;
    }
    this.output.handleUpdate(update);
    const codex = update._meta?.codex;
    const status = codex && typeof codex === "object" && "threadStatus" in codex
      ? codex.threadStatus : null;
    if (status && typeof status === "object" && "type" in status) {
      if (status.type === "active" || status.type === "idle" || status.type === "systemError") {
        if (status.type !== "active") this.finishPending(status.type === "idle" ? "status unavailable" : "interrupted");
        this.completion.status(status.type);
        this.remoteTurnActive = status.type === "active";
        this.turnRunning = this.remoteTurnActive;
        this.cb.onStatus(status.type === "active" ? "running" : status.type === "idle" ? "ready" : "error");
      }
    }
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
    this.completion.start();
    this.turnRunning = true;
    this.remoteTurnActive = null;
    this.stopRequested = false;
    this.cb.onStatus("running");
    this.output.reset();

    try {
      const response = await this.connection.agent.request(acp.methods.agent.session.prompt, {
        sessionId: this.sessionId,
        prompt: [{ type: "text", text }],
      });
      if (this.remoteTurnActive !== true) this.finishPending(response.stopReason === "end_turn" ? "status unavailable" : "interrupted");
      this.completion.finish(response.stopReason);
      this.pushMaster("status", `Turn ended (${response.stopReason})`);
      if (this.remoteTurnActive !== true && !this.disposed) {
        this.turnRunning = false;
        this.cb.onStatus("ready");
      }
    } catch (err) {
      this.finishPending("interrupted");
      this.completion.finish("error");
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
    if (!this.connection || !this.sessionId || !this.turnRunning || this.stopRequested || this.disposed) return;
    this.stopRequested = true;
    this.questions.cancel();
    this.completion.cancel();
    try {
      await this.connection.agent.notify(acp.methods.agent.session.cancel, {
        sessionId: this.sessionId,
      });
      const id = randomUUID();
      this.emitTranscript({ id, role: "stopped", text: "Stopped", at: Date.now() });
      this.pushMaster("stopped", "Stopped", id);
    } catch (error) {
      this.stopRequested = false;
      throw error;
    }
  }

  respondPermission(_requestId: string, _optionId: string): void {
    void _requestId;
    void _optionId;
  }

  respondAskQuestion(requestId: string, outcome: unknown): void {
    this.questions.respond(requestId, outcome);
  }

  private finishPending(status: string): void {
    this.questions.cancel();
    this.output.finish(status);
  }

  private async handlePermission(
    params: acp.RequestPermissionRequest,
  ): Promise<acp.RequestPermissionResponse> {
    const title = params.toolCall?.title ?? "Permission requested";
    const optionId = autoApprovePermission(params.options ?? []);
    this.pushMaster("permission", optionId ? `Auto-approved: ${title}` : title);
    if (!optionId) {
      return { outcome: { outcome: "cancelled" } };
    }
    return { outcome: { outcome: "selected", optionId } };
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
    this.finishPending("interrupted");
    this.disposed = true;
    this.completion.cancel();
    this.prompts.dispose();
    this.clearSessionId();
    const owner = this.connectionOwner ?? this;
    owner.connectionUsers -= 1;
    if (owner.connectionUsers <= 0) {
      owner.connection?.close();
      if (owner.proc && !owner.proc.killed) owner.proc.kill();
      owner.proc = null;
      owner.connection = null;
    }
    this.connection = null;
    this.proc = null;
  }
}
