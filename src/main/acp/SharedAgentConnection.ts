import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type * as acp from "@agentclientprotocol/sdk";

/**
 * Agent process + ACP connection for an AcpSession. Fork siblings share the
 * owner's connection; the owner closes it when its user count reaches zero.
 */
export abstract class SharedAgentConnection {
  protected proc: ChildProcessWithoutNullStreams | null = null;
  protected connection: acp.ClientConnection | null = null;
  private connectionOwner: SharedAgentConnection | null = null;
  private connectionUsers = 1;

  /** Fork siblings share one agent process; warm-pool sessions must not steal updates. */
  isSameAgentConnection(other: SharedAgentConnection): boolean {
    const self = this.connectionOwner ?? this;
    const peer = other.connectionOwner ?? other;
    return self === peer;
  }

  /** Point `child` at this connection; the owner keeps the process. */
  protected shareConnectionWith(child: SharedAgentConnection): void {
    const owner = this.connectionOwner ?? this;
    child.connection = this.connection;
    child.proc = null;
    child.connectionOwner = owner;
    owner.connectionUsers += 1;
  }

  /** Drop this session's use of the connection; the last user closes it and kills the process. */
  protected releaseConnection(): void {
    const owner = this.connectionOwner ?? this;
    owner.connectionUsers -= 1;
    if (owner.connectionUsers <= 0) {
      owner.connection?.close();
      if (owner.proc && !owner.proc.killed) owner.proc.kill();
      owner.proc = null;
      owner.connection = null;
    }
    // The owner keeps its handles while siblings still use them, so the last one can close them.
    if (owner !== this) {
      this.connection = null;
      this.proc = null;
    }
  }
}
