import type { AgentKind } from "../../shared/agentKind";

/** Minimal surface WarmSessionPool needs from an ACP session. */
type WarmAcp = {
  start(options?: { quiet?: boolean }): Promise<void>;
  dispose(): Promise<void>;
};

type Slot<T extends WarmAcp> = {
  cwd: string;
  acp: T;
  ready: Promise<void>;
};

/** Invisible, fully-started ACP sessions: one per available agent, all for one cwd. */
export class WarmSessionPool<T extends WarmAcp = WarmAcp> {
  private slots = new Map<AgentKind, Slot<T>>();

  /** Keep one warm session per agent for `cwd`; drop slots for other agents or folders. */
  ensure(agents: AgentKind[], cwd: string, open: (agent: AgentKind) => T): void {
    if (!cwd.trim()) return;
    for (const [agent, slot] of this.slots) {
      if (slot.cwd !== cwd || !agents.includes(agent)) this.drop(agent);
    }
    for (const agent of agents) {
      if (!this.slots.has(agent)) this.fill(agent, cwd, open(agent));
    }
  }

  async claim(agent: AgentKind, cwd: string): Promise<T | null> {
    const slot = this.slots.get(agent);
    if (!slot || slot.cwd !== cwd) return null;
    this.slots.delete(agent);
    try {
      await slot.ready;
      return slot.acp;
    } catch {
      await slot.acp.dispose().catch(() => undefined);
      return null;
    }
  }

  async dispose(): Promise<void> {
    const slots = [...this.slots.values()];
    this.slots.clear();
    await Promise.all(slots.map((slot) => slot.acp.dispose().catch(() => undefined)));
  }

  private drop(agent: AgentKind): void {
    const slot = this.slots.get(agent);
    this.slots.delete(agent);
    if (slot) void slot.acp.dispose().catch(() => undefined);
  }

  private fill(agent: AgentKind, cwd: string, acp: T): void {
    const ready = acp.start({ quiet: true }).catch(async (error) => {
      if (this.slots.get(agent)?.acp === acp) this.slots.delete(agent);
      await acp.dispose().catch(() => undefined);
      throw error;
    });
    // Slots nobody claims would otherwise surface as unhandled rejections.
    ready.catch(() => undefined);
    this.slots.set(agent, { cwd, acp, ready });
  }
}
