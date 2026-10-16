import { homedir } from "node:os";
import type { AgentKind } from "../../shared/agentKind";
import { agentSearchPath } from "./agentSearchPath";
import { findOnPath } from "./findOnPath";
import { packageBin } from "./packageBin";
import { resolvePathCommand } from "./resolvePathCommand";

interface AgentPreset {
  kind: AgentKind;
  command: string;
  args: string[];
  authMethodId?: string;
  /** Reads the AIR fork point on `session/fork`, so a fork can drop history after a message. */
  forksAtMessage?: boolean;
  /** External CLI the adapter shells out to; the agent is unavailable without it. */
  requiredCommand?: string;
  /** Extra environment for the adapter process. */
  env?: Record<string, string>;
}

function resolveCursorAgent(): string {
  return resolvePathCommand("agent");
}

function claudeCommand(): string {
  return process.env.CLAUDE_CODE_EXECUTABLE || "claude";
}

function codexCommand(): string {
  return process.env.CODEX_PATH || "codex";
}

/** The user's own install of an agent CLI; the app does not bundle Claude Code or Codex. */
function userCli(command: string): string {
  return findOnPath(command, agentSearchPath(process.env.HOME ?? homedir())) ?? command;
}

export const AGENT_PRESETS: Record<AgentKind, AgentPreset> = {
  claude: {
    kind: "claude",
    command: "node",
    get args() {
      return [packageBin("@agentclientprotocol/claude-agent-acp")];
    },
    forksAtMessage: true,
    get requiredCommand() {
      return claudeCommand();
    },
    get env() {
      return { CLAUDE_CODE_EXECUTABLE: userCli(claudeCommand()) };
    },
  },
  codex: {
    kind: "codex",
    command: "node",
    get args() {
      return [packageBin("@agentclientprotocol/codex-acp")];
    },
    forksAtMessage: true,
    get requiredCommand() {
      return codexCommand();
    },
    get env() {
      return { CODEX_PATH: userCli(codexCommand()) };
    },
  },
  cursor: {
    kind: "cursor",
    get command() {
      return resolveCursorAgent();
    },
    args: ["acp"],
    authMethodId: "cursor_login",
  },
  pi: {
    kind: "pi",
    command: "node",
    get args() {
      return [packageBin("pi-acp")];
    },
    get requiredCommand() {
      return process.env.PI_ACP_PI_COMMAND || "pi";
    },
  },
};
