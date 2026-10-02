import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { Readable, Writable } from "node:stream";
import { randomUUID } from "node:crypto";
import * as acp from "@agentclientprotocol/sdk";
import type { AgentKind, TranscriptItem, TranscriptTurn } from "../../shared/types";
import { AGENT_PRESETS } from "./presets";
import { spawnAgentProcess } from "./spawnAgentProcess";
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
import type { AirForkPoint } from "./airForkPoint";
import { drainAgentStream } from "./drainAgentStream";
import { formatAgentError } from "../../shared/formatAgentError";
import { registerSessionRoute, unregisterSessionRoute, sessionForUpdate } from "./sessionRoutes";
import { TurnBuilder } from "./TurnBuilder";

export class AcpSession {
  id: string;
  readonly agent: AgentKind;
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
  private initializationMeta: unknown;
  private cb: SessionCallbacks;
  private questions: PendingQuestions;
  private files: SessionFiles;
  private output: SessionOutput;
  private turns: TurnBuilder;
  private disposed = false;
  /** When false, session updates are not mirrored to transcript/Switchboard (load/resume replay). */
  private mirrorUpdates = true;
  private starting: Promise<void> | null = null;
  private completion = new PromptCompletion(() => {
    this.turns.complete();
    this.cb.onPromptComplete();
  });
  private prompts = new PromptQueue(
    (text) => this.runPrompt(text),
    {
      onWaiting: (id) => this.turns.setQueued(id, true),
      onReleased: (id) => this.turns.activate(id),
      onDiscarded: (id) => {
        const removed = this.turns.discard(id);
        if (removed) this.cb.onTurnRemoved?.(removed.id);
      },
    },
  );
  private delivery = new PromptDelivery({
    isRunning: () => this.turnRunning,
    prompt: (text, id) => this.prompts.send(text, id),
    steer: (text) => {
      if (!this.connection || !this.sessionId || this.disposed) throw new Error("Session closed");
      return this.connection.agent.request("_session/steering", {
        sessionId: this.sessionId,
        prompt: [{ type: "text", text }],
        _meta: { steering: { idleBehavior: "promptRequired" } },
      });
    },
    onSupport: (supported) => this.cb.onSteeringSupport(supported),
  });

  constructor(
    id: string,
    agent: AgentKind,
    cwd: string,
    _bus: GlobalEventBus,
    cb: SessionCallbacks,
  ) {
    this.id = id;
    this.agent = agent;
    this.cwd = cwd;
    this.cb = cb;
    this.files = new SessionFiles(cwd);
    this.questions = new PendingQuestions(
      id,
      (req) => this.cb.onAskQuestion(req),
      (requestId) => this.cb.onQuestionSettled?.(requestId),
    );
    // Lifecycle emits (open/complete/stop) must always reach the UI. Only gate
    // streamed agent updates below — load/resume replay sets mirrorUpdates false.
    this.turns = new TurnBuilder((turn) => {
      this.cb.onTurn(turn);
    });
    this.output = new SessionOutput(agent, (item, replaceId) => {
      if (!this.mirrorUpdates) return;
      this.turns.apply(item, replaceId);
    });
  }

  /** Fork siblings share one agent process; warm-pool sessions must not steal updates. */
  isSameAgentConnection(other: AcpSession): boolean {
    const self = this.connectionOwner ?? this;
    const peer = other.connectionOwner ?? other;
    return self === peer;
  }

  /** Replace in-memory turns after hydrate/fork (does not emit). */
  restoreTurns(turns: TranscriptTurn[]): void {
    this.turns.restore(turns);
  }

  clipTurnsThrough(eventId: string): TranscriptTurn[] {
    return this.turns.clipThrough(eventId) ?? [];
  }

  /** Rebind Switcheroo session id + callbacks after claiming from the warm pool. */
  adopt(id: string, cb: SessionCallbacks): void {
    this.id = id;
    this.cb = cb;
    this.questions.setSessionId(id);
  }

  start(options?: { quiet?: boolean }): Promise<void> {
    if (this.sessionId) return Promise.resolve();
    if (!this.starting) {
      this.starting = this.startSession(options).finally(() => { this.starting = null; });
    }
    return this.starting;
  }

  /** Reopen a persisted session via resume, then load. */
  attachExisting(sessionId: string, options?: { quiet?: boolean }): Promise<void> {
    if (this.sessionId) return Promise.resolve();
    if (!this.starting) {
      this.starting = this.attachSession(sessionId, options).finally(() => { this.starting = null; });
    }
    return this.starting;
  }

  private async startSession(options?: { quiet?: boolean }): Promise<void> {
    await this.connectAgent(options);
    await this.createAgentSession();
  }

  /** Allocate a new agent session on the current connection. */
  private async createAgentSession(): Promise<void> {
    if (!this.connection) throw new Error("Session closed");
    const session = await this.connection.agent.request(acp.methods.agent.session.new, {
      cwd: this.cwd,
      mcpServers: [],
    });
    this.setSessionId(session.sessionId);
    this.turnRunning = false;
    this.remoteTurnActive = null;
    this.cb.onStatus("ready");
  }

  private async attachSession(sessionId: string, options?: { quiet?: boolean }): Promise<void> {
    await this.connectAgent(options);
    if (!this.connection) throw new Error("Session closed");
    // Never-prompted sessions often have an agent id / session-env but no
    // transcript. Resuming them yields a hollow session that completes with no
    // assistant text. Mint a fresh agent session instead.
    if (this.turns.list().length === 0) {
      this.mirrorUpdates = false;
      await this.createAgentSession();
      return;
    }
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
        // load/resume often replays history as session updates — keep those off the
        // transcript until the next prompt (replay can arrive after the RPC returns).
        this.mirrorUpdates = false;
        this.turnRunning = false;
        this.remoteTurnActive = null;
        const response = await this.connection.agent.request(method, params) as {
          sessionId?: string;
        } | void;
        const resumedId =
          response && typeof response === "object" && typeof response.sessionId === "string"
            ? response.sessionId
            : sessionId;
        this.setSessionId(resumedId);
        // Replay may have flipped turnRunning via status updates; we are idle until the next prompt.
        this.turnRunning = false;
        this.remoteTurnActive = null;
        this.output.reset();
        this.cb.onStatus("ready");
        return;
      } catch (err) {
        this.clearSessionId();
        this.turnRunning = false;
        this.remoteTurnActive = null;
        errors.push(formatAgentError(err));
      }
    }
    const detail = errors.join("; ");
    // Empty / never-prompted agent sessions often fail load/resume (Cursor: not found;
    // Codex: no rollout for the thread id). Reuse this connection and mint a fresh one.
    if (/invalid params|not found|no conversation|no rollout/i.test(detail)) {
      this.mirrorUpdates = false;
      await this.createAgentSession();
      return;
    }
    throw new Error(
      `Could not reopen session (${detail}). Send a message in this session to reconnect, then fork.`,
    );
  }

  async fork(forkPoint?: AirForkPoint): Promise<string> {
    if (!this.connection || !this.sessionId || this.disposed) {
      throw new Error("Session not ready to fork");
    }
    return forkAcpSession(this.connection, this.sessionId, this.cwd, forkPoint);
  }

  /** Fork on this connection and return a sibling session sharing the agent process. */
  async forkSibling(
    id: string,
    bus: GlobalEventBus,
    cb: SessionCallbacks,
    forkPoint?: AirForkPoint,
  ): Promise<AcpSession> {
    const forkedId = await this.fork(forkPoint);
    const owner = this.connectionOwner ?? this;
    const child = new AcpSession(id, this.agent, this.cwd, bus, cb);
    child.connection = this.connection;
    child.proc = null;
    child.connectionOwner = owner;
    owner.connectionUsers += 1;
    child.setSessionId(forkedId);
    child.initializationMeta = this.initializationMeta;
    child.delivery.configure(this.initializationMeta);
    try {
      // Fork only allocates a session id. Codex and Claude need resume before
      // prompts/updates work on the forked id.
      if (this.agent === "codex" || this.agent === "claude") {
        if (!child.connection) throw new Error("Session closed while forking");
        // Resume may replay history after the RPC returns; keep mirroring off until prompt.
        child.mirrorUpdates = false;
        await child.connection.agent.request(acp.methods.agent.session.resume, {
          sessionId: forkedId,
          cwd: this.cwd,
          mcpServers: [],
        });
        child.output.reset();
      }
    } catch (error) {
      await child.dispose();
      throw error;
    }
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

  private async connectAgent(options?: { quiet?: boolean }): Promise<void> {
    if (!options?.quiet) this.cb.onStatus("connecting");
    const preset = AGENT_PRESETS[this.agent];
    const command = preset.command;

    try {
      this.proc = await spawnAgentProcess(command, preset.args, this.cwd);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!this.disposed) this.cb.onStatus("error", message);
      throw new Error(message);
    }

    drainAgentStream(this.proc.stderr);

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
        this.noteSystem("Question from agent");
        return this.questions.request(ctx.params, ctx.signal);
      })
      .onNotification("cursor/update_todos", (params: unknown) => params, async () => {
        this.noteSystem("Todos updated");
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
    this.cb.onForkSupport(caps?.sessionCapabilities?.fork != null);
    this.initializationMeta = initialized._meta;
    this.delivery.configure(this.initializationMeta);

    if (preset.authMethodId) {
      try {
        await agent.request(acp.methods.agent.authenticate, {
          methodId: preset.authMethodId,
        });
      } catch {
        // Auth is optional for some agents; avoid console.error (EPIPE under Electron).
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
    if (update.sessionUpdate === "usage_update") {
      this.cb.onUsage({
        used: update.used,
        size: update.size,
        cost: update.cost
          ? { amount: update.cost.amount, currency: update.cost.currency }
          : undefined,
      });
      return;
    }
    this.output.handleUpdate(update);
    const codex = update._meta?.codex;
    const status = codex && typeof codex === "object" && "threadStatus" in codex
      ? codex.threadStatus : null;
    if (status && typeof status === "object" && "type" in status) {
      if (status.type === "active" || status.type === "idle" || status.type === "systemError") {
        // Ignore live-status during load/resume replay — it would leave turnRunning
        // stuck true and the next user message would be sent as a steer.
        if (!this.mirrorUpdates) return;
        if (status.type !== "active") this.finishPending(status.type === "idle" ? "status unavailable" : "interrupted");
        this.completion.status(status.type);
        this.remoteTurnActive = status.type === "active";
        this.turnRunning = this.remoteTurnActive;
        this.cb.onStatus(status.type === "active" ? "running" : status.type === "idle" ? "ready" : "error");
      }
    }
  }

  /**
   * Start a prompt. By default waits until the turn finishes.
   * Pass `{ wait: false }` to return the turn id as soon as delivery is accepted.
   */
  async prompt(text: string, options?: { wait?: boolean }): Promise<string> {
    if (!this.sessionId || this.disposed) throw new Error("Session not ready");
    this.mirrorUpdates = true;
    this.output.reset();
    const userItem: TranscriptItem = {
      id: randomUUID(),
      role: "user",
      text,
      at: Date.now(),
    };
    // Decide steer vs prompt before opening a turn so an inject lands on the
    // in-flight turn as an event instead of a sibling user-only turn.
    // Prompt mode must NOT start the agent request until the turn exists —
    // otherwise a fast end_turn drops every streamed chunk.
    const decision = await this.delivery.enqueue(text, userItem.id);

    let turnId: string;
    let completion: Promise<void>;
    if (decision.mode === "injected") {
      // Start a fresh assistant bubble after the steer so chunks don't splice into pre-steer text.
      this.output.reset();
      this.turns.apply(userItem);
      turnId = this.turns.activeTurnId() ?? userItem.id;
      completion = decision.completion;
    } else if (decision.mode === "startedNewTurn") {
      const turn = this.turns.open(userItem);
      turnId = turn.id;
      this.completion.detached();
      this.turns.activateLatestRunning();
      if (this.remoteTurnActive !== false) {
        this.turnRunning = true;
        this.cb.onStatus("running");
      }
      completion = decision.completion;
    } else {
      const turn = this.turns.open(userItem);
      turnId = turn.id;
      completion = this.delivery.startPrompt(text, userItem.id);
    }

    const finished = completion.then(
      () => {
        if (decision.mode === "injected") return;
        // Steering startedNewTurn finishes without runPrompt; prompt mode waits on the queue.
        if (!this.turnRunning) this.turns.complete();
        else this.turns.completeIfOrphan(userItem.id);
      },
      (error) => {
        // Errors must clear the thinking state even when PromptCompletion cancels.
        this.turns.complete();
        throw error;
      },
    );
    if (options?.wait === false) {
      void finished.catch(() => undefined);
      return turnId;
    }
    await finished;
    return turnId;
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
      await this.requestPrompt(text);
    } catch (err) {
      const msg = formatAgentError(err);
      if (!/session not found/i.test(msg) || this.disposed || !this.connection) {
        this.failPrompt(msg);
        throw err;
      }
      // Stale agent session after restart: mint a fresh one and retry once.
      this.clearSessionId();
      await this.createAgentSession();
      this.mirrorUpdates = true;
      this.turnRunning = true;
      this.remoteTurnActive = null;
      this.cb.onStatus("running");
      try {
        await this.requestPrompt(text);
      } catch (retryErr) {
        this.failPrompt(formatAgentError(retryErr));
        throw retryErr;
      }
    }
  }

  private async requestPrompt(text: string): Promise<void> {
    if (!this.connection || !this.sessionId || this.disposed) throw new Error("Session not ready");
    const response = await this.connection.agent.request(acp.methods.agent.session.prompt, {
      sessionId: this.sessionId,
      prompt: [{ type: "text", text }],
    });
    if (this.remoteTurnActive !== true) this.finishPending(response.stopReason === "end_turn" ? "status unavailable" : "interrupted");
    this.completion.finish(response.stopReason);
    if (this.remoteTurnActive !== true && !this.disposed) {
      this.turnRunning = false;
      this.cb.onStatus("ready");
    }
  }

  private failPrompt(msg: string): void {
    this.finishPending("interrupted");
    // finish("error") cancels PromptCompletion (no done-sound) — still end the turn.
    this.completion.finish("error");
    this.noteSystem(msg);
    this.turns.complete();
    if (this.remoteTurnActive !== true && !this.disposed) {
      this.turnRunning = false;
      this.cb.onStatus("error", msg);
    }
  }

  async cancel(): Promise<void> {
    this.prompts.clearPending();
    if (!this.connection || !this.sessionId || !this.turnRunning || this.stopRequested || this.disposed) return;
    this.stopRequested = true;
    this.questions.cancel();
    this.completion.cancel();
    try {
      await this.connection.agent.notify(acp.methods.agent.session.cancel, {
        sessionId: this.sessionId,
      });
      this.turns.stop({ id: randomUUID(), role: "stopped", text: "Stopped", at: Date.now() });
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
    this.noteSystem(optionId ? `Auto-approved: ${title}` : title);
    if (!optionId) {
      return { outcome: { outcome: "cancelled" } };
    }
    return { outcome: { outcome: "selected", optionId } };
  }

  private noteSystem(text: string): void {
    if (this.disposed || !this.mirrorUpdates) return;
    this.turns.apply({ id: randomUUID(), role: "system", text, at: Date.now() });
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
