export type AgentKind = "claude" | "codex" | "cursor" | "pi" | "prime";

const AGENT_KINDS = new Set<AgentKind>(["claude", "codex", "cursor", "pi", "prime"]);

export function isAgentKind(value: unknown): value is AgentKind {
  return typeof value === "string" && AGENT_KINDS.has(value as AgentKind);
}
