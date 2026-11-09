import type { AgentKind } from "../../shared/agentKind";
import { isRecord } from "../../shared/isRecord";

/** A `CODEX_CONFIG` the user already exports, so ours adds to it. */
function userCodexConfig(): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(process.env.CODEX_CONFIG ?? "{}");
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Codex session instructions go in `CODEX_CONFIG`: codex-acp merges it into every thread's config, so
 * they hold across resume, load, fork and compaction. Its AIR `customInstructions` only reach `session/new`.
 */
export function codexInstructionsEnv(agent: AgentKind, instructions: string | null): Record<string, string> {
  if (agent !== "codex" || !instructions) return {};
  return { CODEX_CONFIG: JSON.stringify({ ...userCodexConfig(), developer_instructions: instructions }) };
}
