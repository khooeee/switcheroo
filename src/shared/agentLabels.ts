import type { AgentKind } from "./agentKind";

/** Display names, in New Session picker order. */
export const AGENT_LABELS: Record<AgentKind, string> = {
  claude: "Claude Code",
  codex: "Codex",
  cursor: "Cursor",
  pi: "Pi",
  prime: "Prime Agent",
};
