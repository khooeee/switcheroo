import type { AgentKind } from "../../shared/agentKind";
import { packageBin } from "./packageBin";
import { resolvePathCommand } from "./resolvePathCommand";

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

function resolveCursorAgent(): string {
  return resolvePathCommand("agent");
}

function resolvePrimeAgent(): string {
  return resolvePathCommand("prime-agent");
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
  prime: {
    kind: "prime",
    label: "Prime Agent",
    get command() {
      return resolvePrimeAgent();
    },
    args: ["--mode", "acp"],
  },
};

export function agentLabel(kind: AgentKind): string {
  return AGENT_PRESETS[kind].label;
}
