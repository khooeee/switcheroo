import { randomUUID } from "node:crypto";
import * as acp from "@agentclientprotocol/sdk";
import type { AgentKind } from "../../shared/agentKind";
import type { TranscriptTurn } from "../../shared/transcript";
import { SessionOutput } from "./SessionOutput";
import type { SessionCallbacks } from "./SessionCallbacks";
import { PromptRunner } from "./PromptRunner";
import { answerPermission } from "./answerPermission";
import { SessionFiles } from "./SessionFiles";
import { PendingQuestions } from "./PendingQuestions";
import { forkAcpSession } from "./forkAcpSession";
import type { AirForkPoint } from "./airForkPoint";
import { sessionRoutes } from "./sessionRoutes";
import { TurnBuilder } from "./TurnBuilder";
import { connectAcpAgent } from "./connectAcpAgent";
import { attachAcpSession } from "./attachAcpSession";
import { dispatchSessionUpdate } from "./dispatchSessionUpdate";
import { SharedAgentConnection } from "./SharedAgentConnection";

export class AcpSession extends SharedAgentConnection {
  id: string;
  readonly agent: AgentKind;
  readonly cwd: string;
  sessionId: string | null = null;

  private canLoad = false;
  private canResume = false;
  private initializationMeta: unknown;
  private cb: SessionCallbacks;
  private questions: PendingQuestions;
  private files: SessionFiles;
  private output: SessionOutput;
  private turns: TurnBuilder;
  private runner: PromptRunner;
  private disposed = false;
  /** When false, session updates are not mirrored to transcript/Switchboard (load/resume replay). */
  private mirrorUpdates = true;
  private starting: Promise<void> | null = null;

  constructor(
    id: string,
    agent: AgentKind,
    cwd: string,
    cb: SessionCallbacks,
  ) {
    super();
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
    this.runner = new PromptRunner({
      turns: this.turns,
      output: this.output,
      questions: this.questions,
      callbacks: () => this.cb,
      connection: () => this.connection,
      sessionId: () => this.sessionId,
      isDisposed: () => this.disposed,
      showUpdates: () => { this.mirrorUpdates = true; },
      renewSession: async () => {
        this.clearSessionId();
        await this.createAgentSession();
      },
      finishPending: (status) => this.finishPending(status),
      noteSystem: (text) => this.noteSystem(text),
    });
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
    return this.startOnce(() => this.startSession(options));
  }

  /** Reopen a persisted session via resume, then load. */
  attachExisting(sessionId: string, options?: { quiet?: boolean }): Promise<void> {
    return this.startOnce(() => this.attachSession(sessionId, options));
  }

  /** Concurrent start/attach calls share one in-flight connect. */
  private startOnce(run: () => Promise<void>): Promise<void> {
    if (this.sessionId) return Promise.resolve();
    if (!this.starting) {
      this.starting = run().finally(() => { this.starting = null; });
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
    this.runner.markIdle();
    this.cb.onStatus("ready");
  }

  private async attachSession(sessionId: string, options?: { quiet?: boolean }): Promise<void> {
    await this.connectAgent(options);
    await attachAcpSession({
      connection: this.connection,
      canLoad: this.canLoad,
      canResume: this.canResume,
      cwd: this.cwd,
      turnCount: () => this.turns.list().length,
      setMirrorUpdates: (value) => { this.mirrorUpdates = value; },
      markIdle: () => this.runner.markIdle(),
      setSessionId: (id) => this.setSessionId(id),
      clearSessionId: () => this.clearSessionId(),
      resetOutput: () => this.output.reset(),
      onReady: () => this.cb.onStatus("ready"),
      createAgentSession: () => this.createAgentSession(),
    }, sessionId);
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
    cb: SessionCallbacks,
    forkPoint?: AirForkPoint,
  ): Promise<AcpSession> {
    const forkedId = await this.fork(forkPoint);
    const child = new AcpSession(id, this.agent, this.cwd, cb);
    this.shareConnectionWith(child);
    child.setSessionId(forkedId);
    child.initializationMeta = this.initializationMeta;
    child.runner.configureDelivery(this.initializationMeta);
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
    sessionRoutes.register(sessionId, this);
  }

  private clearSessionId(): void {
    sessionRoutes.unregister(this.sessionId);
    this.sessionId = null;
  }

  private async connectAgent(options?: { quiet?: boolean }): Promise<void> {
    const result = await connectAcpAgent({
      agent: this.agent,
      cwd: this.cwd,
      quiet: options?.quiet,
      isDisposed: () => this.disposed,
      onStatus: (status, message) => {
        if (status === "connecting") this.cb.onStatus("connecting");
        else this.cb.onStatus("error", message);
      },
      onPermission: async (params) => {
        const { note, response } = answerPermission(params);
        this.noteSystem(note);
        return response;
      },
      onReadFile: (params) => this.files.read(params),
      onWriteFile: (params) => this.files.write(params),
      onAskQuestion: async (params, signal) => {
        if (this.disposed || this.runner.stopRequested) return { outcome: "cancelled" };
        this.noteSystem("Question from agent");
        return this.questions.request(params, signal);
      },
      onTodosUpdated: () => this.noteSystem("Todos updated"),
      onSessionUpdate: (sessionId, update) => {
        const target = sessionRoutes.forUpdate(sessionId, this);
        if (target.disposed) return;
        target.handleSessionUpdate(update);
      },
      onProcessExit: (code) => {
        this.finishPending("interrupted");
        this.connection?.close();
        this.cb.onStatus("error", `Agent exited (code ${code ?? "?"})`);
      },
      onConnectionAbort: () => {
        this.finishPending("interrupted");
        if (!this.disposed) this.cb.onStatus("error", "Agent connection closed");
      },
      onForkSupport: (supported) => this.cb.onForkSupport(supported),
      configureDelivery: (meta) => this.runner.configureDelivery(meta),
    });
    this.proc = result.proc;
    this.connection = result.connection;
    this.canLoad = result.canLoad;
    this.canResume = result.canResume;
    this.initializationMeta = result.initializationMeta;
  }

  private handleSessionUpdate(update: acp.SessionUpdate): void {
    dispatchSessionUpdate(update, {
      onAvailableCommands: (commands) => this.cb.onAvailableCommands(commands),
      onUsage: (usage) => this.cb.onUsage(usage),
      onOutput: (output) => this.output.handleUpdate(output),
      onThreadStatus: (status) => {
        // Ignore live-status during load/resume replay — it would leave turnRunning
        // stuck true and the next user message would be sent as a steer.
        if (this.mirrorUpdates) this.runner.applyThreadStatus(status);
      },
    });
  }

  /** Waits for the turn to finish unless `{ wait: false }`; returns the turn id. */
  prompt(text: string, options?: { wait?: boolean }): Promise<string> {
    return this.runner.prompt(text, options);
  }

  cancel(): Promise<void> {
    return this.runner.cancel();
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

  private noteSystem(text: string): void {
    if (this.disposed || !this.mirrorUpdates) return;
    this.turns.apply({ id: randomUUID(), role: "system", text, at: Date.now() });
  }

  async dispose(): Promise<void> {
    this.finishPending("interrupted");
    this.disposed = true;
    this.runner.dispose();
    this.clearSessionId();
    this.releaseConnection();
  }
}
