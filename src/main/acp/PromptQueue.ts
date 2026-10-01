interface PendingMessage {
  id: string;
  text: string;
  resolve: () => void;
  reject: (error: unknown) => void;
}

interface PromptQueueHooks {
  /** Message is waiting behind an in-flight prompt. */
  onWaiting?: (id: string) => void;
  /** Message left the queue to start running. */
  onReleased?: (id: string) => void;
  /** Waiting message was cancelled or the session closed. */
  onDiscarded?: (id: string) => void;
}

export class PromptQueue {
  private pending: PendingMessage[] = [];
  private running = false;
  private disposed = false;

  constructor(
    private run: (text: string) => Promise<void>,
    private hooks: PromptQueueHooks = {},
  ) {}

  send(text: string, id: string): Promise<void> {
    if (this.disposed) return Promise.reject(new Error("Session closed"));
    const result = new Promise<void>((resolve, reject) => {
      this.pending.push({ id, text, resolve, reject });
    });
    if (this.running) this.hooks.onWaiting?.(id);
    if (!this.running) {
      void this.drain();
    }
    return result;
  }

  /** Drop waiting follow-ups without stopping the in-flight prompt. */
  clearPending(): void {
    for (const message of this.pending.splice(0)) {
      this.hooks.onDiscarded?.(message.id);
      message.resolve();
    }
  }

  dispose(): void {
    this.disposed = true;
    for (const message of this.pending.splice(0)) {
      this.hooks.onDiscarded?.(message.id);
      message.reject(new Error("Session closed before the message was sent"));
    }
  }

  private async drain(): Promise<void> {
    this.running = true;
    while (this.pending.length && !this.disposed) {
      const message = this.pending.shift();
      if (!message) break;
      this.hooks.onReleased?.(message.id);
      try {
        await this.run(message.text);
        message.resolve();
      } catch (error) {
        message.reject(error);
      }
    }
    this.running = false;
  }
}
