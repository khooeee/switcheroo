import type { ControlEndpoint } from "./controlFile";

/** The control server's current endpoint; `get` waits for its first start attempt. */
class LiveControlEndpoint {
  private current: ControlEndpoint | null = null;
  private settle: () => void = () => undefined;
  private started = new Promise<void>((resolve) => { this.settle = resolve; });

  set(endpoint: ControlEndpoint | null): void {
    this.current = endpoint;
    this.settle();
  }

  async get(): Promise<ControlEndpoint | null> {
    await this.started;
    return this.current;
  }
}

/** Shared with the ACP layer, which builds Switcheroo's MCP server URL from it. */
export const liveControlEndpoint = new LiveControlEndpoint();
