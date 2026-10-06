/** Key for one subagent transcript in renderer state. */
export function subagentKey(sessionId: string, subagentId: string): string {
  return `${sessionId}\n${subagentId}`;
}
