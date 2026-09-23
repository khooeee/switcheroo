interface PendingMessage {
  text: string;
  resolve: () => void;
  reject: (error: unknown) => void;
}

export class PromptQueue {
  private pending: PendingMessage[] = [];
  private running = false;
  private disposed = false;

  constructor(private run: (text: string) => Promise<void>) {}

  send(text: string): Promise<void> {
    if (this.disposed) return Promise.reject(new Error("Session closed"));
    const result = new Promise<void>((resolve, reject) => {
      this.pending.push({ text, resolve, reject });
    });
    if (!this.running) {
      void this.drain();
    }
    return result;
  }

  dispose(): void {
    this.disposed = true;
    for (const message of this.pending.splice(0)) {
      message.reject(new Error("Session closed before the message was sent"));
    }
  }

  private async drain(): Promise<void> {
    this.running = true;
    while (this.pending.length && !this.disposed) {
      const message = this.pending.shift();
      if (!message) break;
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
