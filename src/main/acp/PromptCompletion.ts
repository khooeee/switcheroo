// Wait for both the prompt response and any remote continuation to finish.
export class PromptCompletion {
  private awaitingResponse = false;
  private remoteActive = false;
  private pending = false;
  private cancelled = false;

  constructor(private notify: () => void) {}

  start(): void {
    this.awaitingResponse = true;
    this.remoteActive = false;
    this.pending = true;
    this.cancelled = false;
  }

  detached(): void {
    this.pending = true;
    this.cancelled = false;
    this.flush();
  }

  status(status: string): void {
    this.remoteActive = status === "active";
    if (status === "systemError") this.cancel();
    this.flush();
  }

  finish(stopReason: string): void {
    this.awaitingResponse = false;
    if (stopReason !== "end_turn") this.cancel();
    this.flush();
  }

  cancel(): void {
    this.cancelled = true;
  }

  private flush(): void {
    if (!this.pending || this.awaitingResponse || this.remoteActive || this.cancelled) return;
    this.pending = false;
    this.notify();
  }
}
