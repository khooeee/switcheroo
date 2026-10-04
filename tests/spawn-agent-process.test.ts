import os from "node:os";
import path from "node:path";
import { test, expect } from "vitest";
import { spawnAgentProcess } from "../src/main/acp/spawnAgentProcess";

test("spawnAgentProcess rejects missing command", async () => {
  await expect(
    spawnAgentProcess("/nonexistent/switcheroo-agent-binary", [], process.cwd()),
  ).rejects.toThrow(/Command not found/);
});

test("spawnAgentProcess rejects missing working directory", async () => {
  const cwd = path.join(os.tmpdir(), `switcheroo-missing-cwd-${process.pid}`);
  await expect(
    spawnAgentProcess(process.execPath, ["-e", ""], cwd),
  ).rejects.toThrow(/Working directory does not exist/);
});
