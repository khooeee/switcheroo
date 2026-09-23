interface Options {
  isRunning: () => boolean;
  prompt: (text: string) => Promise<void>;
  steer: (text: string) => Promise<unknown>;
  onSupport: (supported: boolean) => void;
  onDetachedTurn: () => void;
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

  send(text: string): Promise<void> {
    // Serialize delivery decisions, but don't hold this lock for a whole prompt.
    const delivery = this.dispatch.then(() => this.deliver(text));
    this.dispatch = delivery.then(() => undefined, () => undefined);
    return delivery.then(({ completion }) => completion);
  }

  private async deliver(text: string): Promise<{ completion: Promise<void> }> {
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
        return { completion: this.options.prompt(text) };
      }
      const outcome = response && typeof response === "object" && "outcome" in response
        ? response.outcome : undefined;
      if (outcome === "injected") return { completion: Promise.resolve() };
      if (outcome === "startedNewTurn") {
        this.options.onDetachedTurn();
        return { completion: Promise.resolve() };
      }
      if (outcome !== "promptRequired") {
        // Retrying an ambiguous failure could deliver the same instruction twice.
        throw new Error("The agent did not confirm delivery of the steering message.");
      }
    }
    return { completion: this.options.prompt(text) };
  }
}
