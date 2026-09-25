import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import type { AgentKind } from "../../shared/types";

export interface AgentPreset {
  kind: AgentKind;
  label: string;
  command: string;
  args: string[];
  authMethodId?: string;
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
    command: "npx",
    args: ["-y", "@agentclientprotocol/claude-agent-acp"],
  },
  codex: {
    kind: "codex",
    label: "Codex",
    command: "npx",
    args: ["-y", "@agentclientprotocol/codex-acp"],
  },
  cursor: {
    kind: "cursor",
    label: "Cursor",
    command: resolveCursorAgent(),
    args: ["acp"],
    authMethodId: "cursor_login",
  },
  pi: {
    kind: "pi",
    label: "Pi",
    command: "npx",
    args: ["-y", "pi-acp"],
  },
};

export function agentLabel(kind: AgentKind): string {
  return AGENT_PRESETS[kind].label;
}
