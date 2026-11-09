import { randomUUID } from "node:crypto";
import * as acp from "@agentclientprotocol/sdk/unstable";
import type { AgentKind } from "../../shared/agentKind";
import type { TranscriptTurn } from "../../shared/transcript";
import { SessionOutput } from "./SessionOutput";
import type { SessionCallbacks } from "./SessionCallbacks";
import { PromptRunner } from "./PromptRunner";
import { SessionFiles } from "./SessionFiles";
import { PendingQuestions } from "./PendingQuestions";
import { forkAcpSession } from "./forkAcpSession";
import { resumeAcpSession } from "./resumeAcpSession";
import type { AirForkPoint } from "./airForkPoint";
import type { McpServersSource } from "./McpServersSource";
import { sessionRoutes } from "./sessionRoutes";
import { TurnBuilder } from "./TurnBuilder";
import { connectAcpAgent } from "./connectAcpAgent";
import { attachAcpSession } from "./attachAcpSession";
import { SharedAgentConnection } from "./SharedAgentConnection";
import { SessionUpdateRouter } from "./SessionUpdateRouter";
import { SessionConfigOptions } from "./SessionConfigOptions";
import { sessionConnectionHandlers } from "./sessionConnectionHandlers";

export class AcpSession extends SharedAgentConnection {
  id: string;
  readonly agent: AgentKind;
  readonly cwd: string;
  sessionId: string | null = null;
  /** Model, effort and other agent config options. */
  readonly config: SessionConfigOptions;

  private canLoad = false;
  private canResume = false;
  private initializationMeta: unknown;
  private cb: SessionCallbacks;
  private questions: PendingQuestions;
  private files: SessionFiles;
  private output: SessionOutput;
  private turns: TurnBuilder;
  private updates: SessionUpdateRouter;
  private runner: PromptRunner;
  private disposed = false;
  /** When false, session updates are not mirrored to the transcript (load/resume replay). */
  private mirrorUpdates = true;
  private starting: Promise<void> | null = null;

  constructor(
    id: string,
    agent: AgentKind,
    cwd: string,
    cb: SessionCallbacks,
    /** Switcheroo's MCP server for an aware session; none by default. */
    private readonly mcpServers: McpServersSource = async () => [],
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
    this.output = new SessionOutput(agent, cwd, (item, replaceId) => {
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
      worksUnprompted: agent === "claude",
    });
    this.config = new SessionConfigOptions({
      connection: () => this.connection,
      sessionId: () => this.sessionId,
      onModelConfig: (config) => this.cb.onModelConfig(config),
    });
    this.updates = new SessionUpdateRouter({
      agent,
      cwd,
      turns: this.turns,
      output: this.output,
      callbacks: () => this.cb,
      mirroring: () => this.mirrorUpdates,
      applyThreadStatus: (status) => this.runner.applyThreadStatus(status),
      onConfigOptions: (options) => this.config.note(options),
      owner: this,
    });
  }

  /** Replace in-memory turns after hydrate/fork (does not emit). */
  restoreTurns(turns: TranscriptTurn[]): void {
    this.turns.restore(turns);
  }

  /** Rebind Switcheroo session id + callbacks after claiming from the warm pool. */
  adopt(id: string, cb: SessionCallbacks): void {
    this.id = id;
    this.cb = cb;
    this.questions.setSessionId(id);
    // Steering support was reported to the warm no-op callbacks; replay it to the new owner.
    this.runner.configureDelivery(this.initializationMeta);
    this.config.replay();
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
    await this.connectAgent(await this.mcpServers(), options);
    await this.createAgentSession();
  }

  /** Allocate a new agent session on the current connection. */
  private async createAgentSession(): Promise<void> {
    if (!this.connection) throw new Error("Session closed");
    const session = await this.connection.agent.request(acp.methods.agent.session.new, {
      cwd: this.cwd,
      mcpServers: await this.mcpServers(),
    });
    this.setSessionId(session.sessionId);
    this.config.note(session.configOptions);
    this.runner.markIdle();
    this.cb.onStatus("ready");
  }

  private async attachSession(sessionId: string, options?: { quiet?: boolean }): Promise<void> {
    const mcpServers = await this.mcpServers();
    await this.connectAgent(mcpServers, options);
    await attachAcpSession({
      connection: this.connection,
      canLoad: this.canLoad,
      canResume: this.canResume,
      cwd: this.cwd,
      mcpServers,
      turnCount: () => this.turns.list().length,
      setMirrorUpdates: (value) => { this.mirrorUpdates = value; },
      markIdle: () => this.runner.markIdle(),
      setSessionId: (id) => this.setSessionId(id),
      clearSessionId: () => this.clearSessionId(),
      resetOutput: () => this.output.reset(),
      onReady: () => this.cb.onStatus("ready"),
      onConfigOptions: (options) => this.config.note(options),
      createAgentSession: () => this.createAgentSession(),
    }, sessionId);
  }

  /** `mcpServers` are the fork's own: it gets a new Switcheroo session id. */
  async fork(forkPoint: AirForkPoint | undefined, mcpServers: acp.McpServer[]): Promise<acp.ForkSessionResponse> {
    if (!this.connection || !this.sessionId || this.disposed) throw new Error("Session not ready to fork");
    return forkAcpSession(this.connection, this.sessionId, this.cwd, forkPoint, mcpServers);
  }

  /** Fork on this connection and return a sibling session sharing the agent process. */
  async forkSibling(
    id: string,
    cb: SessionCallbacks,
    forkPoint?: AirForkPoint,
    mcpServersSource: McpServersSource = async () => [],
  ): Promise<AcpSession> {
    const mcpServers = await mcpServersSource();
    const forked = await this.fork(forkPoint, mcpServers);
    const forkedId = forked.sessionId;
    const child = new AcpSession(id, this.agent, this.cwd, cb, mcpServersSource);
    this.shareConnectionWith(child);
    child.setSessionId(forkedId);
    child.initializationMeta = this.initializationMeta;
    child.runner.configureDelivery(this.initializationMeta);
    // The fork's session record already copies the parent's model/effort; only report what differs.
    child.config.inherit(this.config);
    child.config.note(forked.configOptions);
    try {
      // Fork only allocates a session id. Codex and Claude need resume before
      // prompts/updates work on the forked id.
      if (this.agent === "codex" || this.agent === "claude") {
        if (!child.connection) throw new Error("Session closed while forking");
        // Resume may replay history after the RPC returns; keep mirroring off until prompt.
        child.mirrorUpdates = false;
        const resumed = await resumeAcpSession(child.connection, forkedId, this.cwd, mcpServers);
        child.config.note(resumed.configOptions);
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

  private async connectAgent(mcpServers: acp.McpServer[], options?: { quiet?: boolean }): Promise<void> {
    const result = await connectAcpAgent({
      agent: this.agent,
      cwd: this.cwd,
      mcpServers,
      quiet: options?.quiet,
      ...sessionConnectionHandlers({
        callbacks: () => this.cb,
        files: this.files,
        questions: this.questions,
        runner: this.runner,
        isDisposed: () => this.disposed,
        noteSystem: (text) => this.noteSystem(text),
        finishPending: (status) => this.finishPending(status),
        closeConnection: () => this.connection?.close(),
        routerFor: (sessionId) => this.routerFor(sessionId),
      }),
    });
    this.proc = result.proc;
    this.connection = result.connection;
    this.canLoad = result.canLoad;
    this.canResume = result.canResume;
    this.initializationMeta = result.initializationMeta;
  }

  /** Fork siblings share this connection, so an update may belong to another AcpSession. */
  private routerFor(sessionId: string): SessionUpdateRouter | null {
    const target = sessionRoutes.forUpdate(sessionId, this);
    return target.disposed ? null : target.updates;
  }

  /** Waits for the turn to finish unless `{ wait: false }`; returns the turn id. */
  prompt(text: string, options?: { wait?: boolean }): Promise<string> {
    return this.runner.prompt(text, options);
  }

  cancel(): Promise<void> {
    return this.runner.cancel();
  }

  respondAskQuestion(requestId: string, outcome: unknown): void {
    this.questions.respond(requestId, outcome);
  }

  private finishPending(status: string): void {
    this.questions.cancel();
    this.output.finish(status);
    this.updates.subagents.finish();
  }

  private noteSystem(text: string): void {
    if (this.disposed || !this.mirrorUpdates) return;
    this.turns.apply({ id: randomUUID(), role: "system", text, at: Date.now() });
  }

  async dispose(): Promise<void> {
    this.finishPending("interrupted");
    this.disposed = true;
    this.runner.dispose();
    this.updates.dispose();
    this.clearSessionId();
    this.releaseConnection();
  }
}
