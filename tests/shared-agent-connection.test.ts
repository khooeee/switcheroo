import { describe, expect, it, vi } from "vitest";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type * as acp from "@agentclientprotocol/sdk";
import { SharedAgentConnection } from "../src/main/acp/SharedAgentConnection";

class TestSession extends SharedAgentConnection {
  attach(proc: ChildProcessWithoutNullStreams, connection: acp.ClientConnection): void {
    this.proc = proc;
    this.connection = connection;
  }
  fork(): TestSession {
    const child = new TestSession();
    this.shareConnectionWith(child);
    return child;
  }
  release(): void {
    this.releaseConnection();
  }
}

function fakes() {
  const proc = { killed: false, kill: vi.fn() } as unknown as ChildProcessWithoutNullStreams;
  const connection = { close: vi.fn() } as unknown as acp.ClientConnection;
  return { proc, connection };
}

describe("SharedAgentConnection", () => {
  it("kills the process when the last fork sibling releases after the owner", () => {
    const { proc, connection } = fakes();
    const owner = new TestSession();
    owner.attach(proc, connection);
    const child = owner.fork();

    owner.release();
    expect(proc.kill).not.toHaveBeenCalled();

    child.release();
    expect(connection.close).toHaveBeenCalledTimes(1);
    expect(proc.kill).toHaveBeenCalledTimes(1);
  });

  it("kills the process when the owner releases last", () => {
    const { proc, connection } = fakes();
    const owner = new TestSession();
    owner.attach(proc, connection);
    const child = owner.fork();

    child.release();
    expect(proc.kill).not.toHaveBeenCalled();
    owner.release();
    expect(proc.kill).toHaveBeenCalledTimes(1);
  });
});
