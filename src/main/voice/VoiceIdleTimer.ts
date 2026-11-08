/** Fires once after `minutes` without a reset (0 or less never fires). */
export class VoiceIdleTimer {
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly onIdle: (minutes: number) => void) {}

  reset(minutes: number): void {
    this.clear();
    if (!(minutes > 0)) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.onIdle(minutes);
    }, minutes * 60_000);
  }

  clear(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
