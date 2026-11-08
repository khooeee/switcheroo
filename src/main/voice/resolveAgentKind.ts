import type { AgentKind } from "../../shared/agentKind";
import { AGENT_LABELS } from "../../shared/agentLabels";
import { availableAgents } from "../acp/availableAgents";
import { spokenMatchScore } from "./spokenMatchScore";

type Resolved = { ok: true; agent: AgentKind } | { ok: false; error: string; candidates?: string[] };

/** Spoken agent name → installed agent; none named uses `fallback` (last used) when installed. */
export function resolveAgentKind(spoken: string | undefined, fallback: AgentKind): Resolved {
  const installed = availableAgents();
  if (!installed.length) return { ok: false, error: "No coding agents are installed." };
  const labels = installed.map((agent) => AGENT_LABELS[agent]);
  if (!spoken) return { ok: true, agent: installed.includes(fallback) ? fallback : installed[0]! };
  const ranked = installed
    .map((agent) => ({ agent, score: Math.max(spokenMatchScore(spoken, AGENT_LABELS[agent]), spokenMatchScore(spoken, agent)) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0]!;
  if (best.score >= 30) return { ok: true, agent: best.agent };
  // "pie" for Pi: names too short for fuzzy token matching.
  const letters = spoken.toLowerCase().replace(/[^a-z]/g, "");
  const prefixed = installed.find((agent) => letters.startsWith(agent));
  if (prefixed) return { ok: true, agent: prefixed };
  return { ok: false, error: `"${spoken}" is not an installed agent.`, candidates: labels };
}
