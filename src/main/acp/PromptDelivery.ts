export type DeliveryMode = "injected" | "startedNewTurn" | "prompt";

/** Steer outcomes include a completion; prompt mode must be started by the caller after opening a turn. */
export type DeliveryDecision =
  | { mode: "injected" | "startedNewTurn"; completion: Promise<void> }
  | { mode: "prompt" };

interface Options {
  isRunning: () => boolean;
  prompt: (text: string, id: string) => Promise<void>;
  steer: (text: string) => Promise<unknown>;
  onSupport: (supported: boolean) => void;
}

export class PromptDelivery {
  private supported = false;
  private dispatch = Promise.resolve();

  constructor(private options: Options) {}

  configure(metadata: unknown): void {
    const steering = metadata && typeof metadata === "object" && "steering" in metadata
      ? metadata.steering : null;
    this.supported = !!steering && typeof steering === "object" &&
      "supported" in steering && steering.supported === true;
    this.options.onSupport(this.supported);
  }

  send(text: string, id: string): Promise<void> {
    return this.enqueue(text, id).then((decision) => {
      if (decision.mode === "prompt") return this.options.prompt(text, id);
      return decision.completion;
    });
  }

  /**
   * Resolve once delivery is decided. Prompt mode does not start the agent
   * request — the caller must open a turn first, then call `startPrompt`.
   */
  enqueue(text: string, id: string): Promise<DeliveryDecision> {
    // Serialize delivery decisions, but don't hold this lock for a whole prompt.
    const delivery = this.dispatch.then(() => this.deliver(text, id));
    this.dispatch = delivery.then(() => undefined, () => undefined);
    return delivery;
  }

  startPrompt(text: string, id: string): Promise<void> {
    return this.options.prompt(text, id);
  }

  private async deliver(text: string, id: string): Promise<DeliveryDecision> {
    if (this.supported && this.options.isRunning()) {
      let response: unknown;
      try {
        response = await this.options.steer(text);
      } catch (error) {
        if (!error || typeof error !== "object" || !("code" in error) || error.code !== -32601) {
          throw error;
        }
        // A stale capability flag must not prevent the message from being sent.
        this.supported = false;
        this.options.onSupport(false);
        return { mode: "prompt" };
      }
      const outcome = response && typeof response === "object" && "outcome" in response
        ? response.outcome : undefined;
      if (outcome === "injected") {
        return { mode: "injected", completion: Promise.resolve() };
      }
      if (outcome === "startedNewTurn") {
        return { mode: "startedNewTurn", completion: Promise.resolve() };
      }
      if (outcome !== "promptRequired") {
        // Retrying an ambiguous failure could deliver the same instruction twice.
        throw new Error("The agent did not confirm delivery of the steering message.");
      }
    }
    return { mode: "prompt" };
  }
}
