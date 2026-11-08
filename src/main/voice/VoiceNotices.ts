const QUIET_MS = 1000;
const MAX_QUEUED = 10;

/** Queue of announcements, delivered together once the conversation has been quiet a moment. */
export class VoiceNotices {
  /** Marks injected text so the model never mistakes it for the user (see voiceInstructions.md). */
  static readonly HEADER = "[switcheroo notice: not from the user]";

  private queue: string[] = [];
  private timer: NodeJS.Timeout | null = null;

  constructor(
    /** Voice can speak at all; when false the queue is dropped. */
    private readonly isActive: () => boolean,
    /** True when nobody is speaking, no response is in flight, and it has been quiet for `quietMs`. */
    private readonly isQuiet: (quietMs: number) => boolean,
    private readonly deliver: (text: string) => void,
  ) {}

  push(text: string): void {
    if (!this.isActive()) return;
    this.queue.push(text);
    if (this.queue.length > MAX_QUEUED) this.queue.splice(0, this.queue.length - MAX_QUEUED);
    this.schedule();
  }

  /** Conversation state changed; check again after the quiet window. */
  poke(): void {
    if (this.queue.length) this.schedule();
  }

  clear(): void {
    this.queue = [];
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, QUIET_MS);
  }

  private flush(): void {
    if (!this.queue.length) return;
    if (!this.isActive()) {
      this.queue = [];
      return;
    }
    if (!this.isQuiet(QUIET_MS)) {
      this.schedule();
      return;
    }
    const items = this.queue.splice(0);
    this.deliver(`${VoiceNotices.HEADER} Tell the user briefly, then stop.\n\n${items.join("\n\n")}`);
  }
}
