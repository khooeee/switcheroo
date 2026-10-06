/**
 * `clientCapabilities._meta` that opts into native subagent sessions. The released SDK drops the
 * draft `clientCapabilities.subagents` field; Claude and Codex adapters accept this AIR signal.
 */
export function subagentCapabilityMeta(): Record<string, unknown> {
  return { jetbrains: { air: { version: 1, capabilities: ["nativeSubagentSessions"] } } };
}
