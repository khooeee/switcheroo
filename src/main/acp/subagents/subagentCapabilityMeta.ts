/**
 * `clientCapabilities._meta` that opts into native subagent sessions. The released SDK drops the
 * draft `clientCapabilities.subagents` field, so claude-agent-acp also accepts this AIR signal.
 */
export function subagentCapabilityMeta(): Record<string, unknown> {
  return { jetbrains: { air: { version: 1, capabilities: ["nativeSubagentSessions"] } } };
}
