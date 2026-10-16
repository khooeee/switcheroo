export type AgentKind = "claude" | "codex" | "cursor" | "pi";

const AGENT_KINDS = new Set<AgentKind>(["claude", "codex", "cursor", "pi"]);

export function isAgentKind(value: unknown): value is AgentKind {
  return typeof value === "string" && AGENT_KINDS.has(value as AgentKind);
}
