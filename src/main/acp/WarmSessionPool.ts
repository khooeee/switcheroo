/** Minimal surface WarmSessionPool needs from an ACP session. */
type WarmAcp = {
  /** Switcheroo session id; a claimed session keeps it (its instructions may name it). */
  id: string;
  start(options?: { quiet?: boolean }): Promise<void>;
  dispose(): Promise<void>;
};

type Slot<T extends WarmAcp> = {
  cwd: string;
  acp: T;
  ready: Promise<void>;
};

/** Invisible, fully-started ACP sessions for one cwd: one per key (agent, or agent + Switcheroo aware). */
export class WarmSessionPool<T extends WarmAcp = WarmAcp> {
  private slots = new Map<string, Slot<T>>();

  /** Keep one warm session per key in `openers` for `cwd`; drop other keys and folders. */
  ensure(cwd: string, openers: ReadonlyMap<string, () => T>): void {
    if (!cwd.trim()) return;
    for (const [key, slot] of this.slots) {
      if (slot.cwd !== cwd || !openers.has(key)) this.drop(key);
    }
    for (const [key, open] of openers) {
      if (!this.slots.has(key)) this.fill(key, cwd, open());
    }
  }

  /**
   * Hand over the warm session for `key` in `cwd`, or null. Synchronous so the caller can reuse its id
   * before it finishes starting; `started` is false (and the session disposed) if starting failed.
   */
  take(key: string, cwd: string): { acp: T; started: Promise<boolean> } | null {
    const slot = this.slots.get(key);
    if (!slot || slot.cwd !== cwd) return null;
    this.slots.delete(key);
    const started = slot.ready.then(
      () => true,
      async () => {
        await slot.acp.dispose().catch(() => undefined);
        return false;
      },
    );
    return { acp: slot.acp, started };
  }

  async dispose(): Promise<void> {
    const slots = [...this.slots.values()];
    this.slots.clear();
    await Promise.all(slots.map((slot) => slot.acp.dispose().catch(() => undefined)));
  }

  private drop(key: string): void {
    const slot = this.slots.get(key);
    this.slots.delete(key);
    if (slot) void slot.acp.dispose().catch(() => undefined);
  }

  private fill(key: string, cwd: string, acp: T): void {
    const ready = acp.start({ quiet: true }).catch(async (error) => {
      if (this.slots.get(key)?.acp === acp) this.slots.delete(key);
      await acp.dispose().catch(() => undefined);
      throw error;
    });
    // Slots nobody claims would otherwise surface as unhandled rejections.
    ready.catch(() => undefined);
    this.slots.set(key, { cwd, acp, ready });
  }
}
