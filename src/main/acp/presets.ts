import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentKind } from "../../shared/types";

interface AgentPreset {
  kind: AgentKind;
  label: string;
  command: string;
  args: string[];
  authMethodId?: string;
  /** Reads the AIR fork point on `session/fork`, so a fork can drop history after a message. */
  forksAtMessage?: boolean;
  /** External CLI the adapter shells out to; the agent is unavailable without it. */
  requiredCommand?: string;
}

/** Absolute path to a pinned adapter bin (never go through npx). */
function packageBin(packageName: string): string {
  const parts = packageName.split("/");
  const roots = [process.cwd()];
  if (typeof process.resourcesPath === "string") {
    roots.push(join(process.resourcesPath, "app.asar.unpacked"));
  }
  for (const root of roots) {
    const entry = join(root, "node_modules", ...parts, "dist", "index.js");
    if (existsSync(entry)) return entry;
  }
  throw new Error(`ACP adapter not installed: ${packageName}`);
}

function resolveCursorAgent(): string {
  const candidates = [
    join(homedir(), ".local", "bin", "agent"),
    "/usr/local/bin/agent",
    "agent",
  ];
  for (const c of candidates) {
    if (c === "agent" || existsSync(c)) return c;
  }
  return "agent";
}

export const AGENT_PRESETS: Record<AgentKind, AgentPreset> = {
  claude: {
    kind: "claude",
    label: "Claude Code",
    command: "node",
    get args() {
      return [packageBin("@agentclientprotocol/claude-agent-acp")];
    },
    forksAtMessage: true,
  },
  codex: {
    kind: "codex",
    label: "Codex",
    command: "node",
    get args() {
      return [packageBin("@agentclientprotocol/codex-acp")];
    },
    forksAtMessage: true,
  },
  cursor: {
    kind: "cursor",
    label: "Cursor",
    get command() {
      return resolveCursorAgent();
    },
    args: ["acp"],
    authMethodId: "cursor_login",
  },
  pi: {
    kind: "pi",
    label: "Pi",
    command: "node",
    get args() {
      return [packageBin("pi-acp")];
    },
    get requiredCommand() {
      return process.env.PI_ACP_PI_COMMAND || "pi";
    },
  },
};

export function agentLabel(kind: AgentKind): string {
  return AGENT_PRESETS[kind].label;
}
