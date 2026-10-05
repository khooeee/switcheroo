import { randomUUID } from "node:crypto";
import * as acp from "@agentclientprotocol/sdk";
import type { TranscriptItem } from "../../shared/transcript";
import { formatAgentError } from "../../shared/formatAgentError";
import type { SessionCallbacks } from "./SessionCallbacks";
import type { SessionOutput } from "./SessionOutput";
import type { TurnBuilder } from "./TurnBuilder";
import type { PendingQuestions } from "./PendingQuestions";
import { PromptCompletion } from "./PromptCompletion";
import { PromptQueue } from "./PromptQueue";
import { PromptDelivery } from "./PromptDelivery";

/** What PromptRunner needs from its AcpSession. */
type PromptHost = {
  turns: TurnBuilder;
  output: SessionOutput;
  questions: PendingQuestions;
  callbacks: () => SessionCallbacks;
  connection: () => acp.ClientConnection | null;
  sessionId: () => string | null;
  isDisposed: () => boolean;
  /** Mirror streamed updates to the transcript again (after load/resume replay). */
  showUpdates: () => void;
  /** Drop the stale agent session id and mint a fresh agent session. */
  renewSession: () => Promise<void>;
  finishPending: (status: string) => void;
  noteSystem: (text: string) => void;
};

/** Sends prompts (or steers), tracks whether a turn is running, and cancels it. */
export class PromptRunner {
  private turnRunning = false;
  private remoteTurnActive: boolean | null = null;
  private stopping = false;
  private completion: PromptCompletion;
  private prompts: PromptQueue;
  private delivery: PromptDelivery;

  constructor(private host: PromptHost) {
    const { turns } = host;
    this.completion = new PromptCompletion(() => {
      turns.complete();
      host.callbacks().onPromptComplete();
    });
    this.prompts = new PromptQueue(
      (text) => this.runPrompt(text),
      {
        onWaiting: (id) => turns.setQueued(id, true),
        onReleased: (id) => turns.activate(id),
        onDiscarded: (id) => {
          const removed = turns.discard(id);
          if (removed) host.callbacks().onTurnRemoved?.(removed.id);
        },
      },
    );
    this.delivery = new PromptDelivery({
      isRunning: () => this.turnRunning,
      prompt: (text, id) => this.prompts.send(text, id),
      steer: (text) => {
        const connection = host.connection();
        const sessionId = host.sessionId();
        if (!connection || !sessionId || host.isDisposed()) throw new Error("Session closed");
        return connection.agent.request("_session/steering", {
          sessionId,
          prompt: [{ type: "text", text }],
          _meta: { steering: { idleBehavior: "promptRequired" } },
        });
      },
      onSupport: (supported) => host.callbacks().onSteeringSupport(supported),
    });
  }

  get stopRequested(): boolean {
    return this.stopping;
  }

  configureDelivery(meta: unknown): void {
    this.delivery.configure(meta);
  }

  /** No turn in flight; remote status unknown until the agent reports it. */
  markIdle(): void {
    this.turnRunning = false;
    this.remoteTurnActive = null;
  }

  /** Apply a codex `threadStatus` live update. */
  applyThreadStatus(status: "active" | "idle" | "systemError"): void {
    if (status !== "active") this.host.finishPending(status === "idle" ? "status unavailable" : "interrupted");
    this.completion.status(status);
    this.remoteTurnActive = status === "active";
    this.turnRunning = this.remoteTurnActive;
    this.host.callbacks().onStatus(status === "active" ? "running" : status === "idle" ? "ready" : "error");
  }

  /**
   * Start a prompt. By default waits until the turn finishes.
   * Pass `{ wait: false }` to return the turn id as soon as delivery is accepted.
   */
  async prompt(text: string, options?: { wait?: boolean }): Promise<string> {
    const { host } = this;
    if (!host.sessionId() || host.isDisposed()) throw new Error("Session not ready");
    host.showUpdates();
    host.output.reset();
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
      host.output.reset();
      host.turns.apply(userItem);
      turnId = host.turns.activeTurnId() ?? userItem.id;
      completion = decision.completion;
    } else if (decision.mode === "startedNewTurn") {
      const turn = host.turns.open(userItem);
      turnId = turn.id;
      this.completion.detached();
      host.turns.activateLatestRunning();
      if (this.remoteTurnActive !== false) {
        this.turnRunning = true;
        host.callbacks().onStatus("running");
      }
      completion = decision.completion;
    } else {
      const turn = host.turns.open(userItem);
      turnId = turn.id;
      completion = this.delivery.startPrompt(text, userItem.id);
    }

    const finished = completion.then(
      () => {
        if (decision.mode === "injected") return;
        // Steering startedNewTurn finishes without runPrompt; prompt mode waits on the queue.
        if (!this.turnRunning) host.turns.complete();
        else host.turns.completeIfOrphan(userItem.id);
      },
      (error) => {
        // Errors must clear the thinking state even when PromptCompletion cancels.
        host.turns.complete();
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

  async cancel(): Promise<void> {
    const { host } = this;
    this.prompts.clearPending();
    const connection = host.connection();
    const sessionId = host.sessionId();
    if (!connection || !sessionId || !this.turnRunning || this.stopping || host.isDisposed()) return;
    this.stopping = true;
    host.questions.cancel();
    this.completion.cancel();
    try {
      await connection.agent.notify(acp.methods.agent.session.cancel, { sessionId });
      host.turns.stop({ id: randomUUID(), role: "stopped", text: "Stopped", at: Date.now() });
    } catch (error) {
      this.stopping = false;
      throw error;
    }
  }

  dispose(): void {
    this.completion.cancel();
    this.prompts.dispose();
  }

  private async runPrompt(text: string): Promise<void> {
    const { host } = this;
    if (!host.connection() || !host.sessionId() || host.isDisposed()) throw new Error("Session not ready");
    this.completion.start();
    this.turnRunning = true;
    this.remoteTurnActive = null;
    this.stopping = false;
    host.callbacks().onStatus("running");
    host.output.reset();

    try {
      await this.requestPrompt(text);
    } catch (err) {
      const msg = formatAgentError(err);
      if (!/session not found/i.test(msg) || host.isDisposed() || !host.connection()) {
        this.failPrompt(msg);
        throw err;
      }
      // Stale agent session after restart: mint a fresh one and retry once.
      await host.renewSession();
      host.showUpdates();
      this.turnRunning = true;
      this.remoteTurnActive = null;
      host.callbacks().onStatus("running");
      try {
        await this.requestPrompt(text);
      } catch (retryErr) {
        this.failPrompt(formatAgentError(retryErr));
        throw retryErr;
      }
    }
  }

  private async requestPrompt(text: string): Promise<void> {
    const { host } = this;
    const connection = host.connection();
    const sessionId = host.sessionId();
    if (!connection || !sessionId || host.isDisposed()) throw new Error("Session not ready");
    const response = await connection.agent.request(acp.methods.agent.session.prompt, {
      sessionId,
      prompt: [{ type: "text", text }],
    });
    if (this.remoteTurnActive !== true) host.finishPending(response.stopReason === "end_turn" ? "status unavailable" : "interrupted");
    this.completion.finish(response.stopReason);
    if (this.remoteTurnActive !== true && !host.isDisposed()) {
      this.turnRunning = false;
      host.callbacks().onStatus("ready");
    }
  }

  private failPrompt(msg: string): void {
    const { host } = this;
    host.finishPending("interrupted");
    // finish("error") cancels PromptCompletion (no done-sound) — still end the turn.
    this.completion.finish("error");
    host.noteSystem(msg);
    host.turns.complete();
    if (this.remoteTurnActive !== true && !host.isDisposed()) {
      this.turnRunning = false;
      host.callbacks().onStatus("error", msg);
    }
  }
}
