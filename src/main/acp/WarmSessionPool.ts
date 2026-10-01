import type { AgentKind } from "../../shared/types";

/** Minimal surface WarmSessionPool needs from an ACP session. */
export type WarmAcp = {
  start(options?: { quiet?: boolean }): Promise<void>;
  dispose(): Promise<void>;
};

type Slot<T extends WarmAcp> = {
  agent: AgentKind;
  cwd: string;
  acp: T;
  ready: Promise<void>;
};

/** One invisible, fully-started ACP session for last agent + cwd. */
export class WarmSessionPool<T extends WarmAcp = WarmAcp> {
  private slot: Slot<T> | null = null;

  ensure(agent: AgentKind, cwd: string, open: () => T): void {
    if (!cwd.trim()) return;
    if (this.slot && this.slot.agent === agent && this.slot.cwd === cwd) return;
    this.replace(agent, cwd, open);
  }

  async claim(agent: AgentKind, cwd: string): Promise<T | null> {
    const slot = this.slot;
    if (!slot || slot.agent !== agent || slot.cwd !== cwd) return null;
    this.slot = null;
    try {
      await slot.ready;
      return slot.acp;
    } catch {
      await slot.acp.dispose().catch(() => undefined);
      return null;
    }
  }

  async dispose(): Promise<void> {
    const slot = this.slot;
    this.slot = null;
    if (!slot) return;
    await slot.acp.dispose().catch(() => undefined);
  }

  private replace(agent: AgentKind, cwd: string, open: () => T): void {
    const prev = this.slot;
    this.slot = null;
    if (prev) void prev.acp.dispose().catch(() => undefined);

    const acp = open();
    const ready = acp.start({ quiet: true }).catch(async (error) => {
      if (this.slot?.acp === acp) this.slot = null;
      await acp.dispose().catch(() => undefined);
      throw error;
    });
    this.slot = { agent, cwd, acp, ready };
  }
}
