import type { SubagentUpdate } from "./SubagentUpdate";

const optionalString = (value: unknown) => (typeof value === "string" ? value : undefined);

/** Validate a rewritten subagent notification; null when it is not one we understand. */
export function parseSubagentNotification(
  params: unknown,
): { sessionId: string; update: SubagentUpdate } | null {
  if (!params || typeof params !== "object") return null;
  const { sessionId, update } = params as { sessionId?: unknown; update?: Record<string, unknown> };
  if (typeof sessionId !== "string" || !update || typeof update !== "object") return null;
  const subagentSessionId = update.subagentSessionId;
  if (typeof subagentSessionId !== "string" || !subagentSessionId) return null;
  if (update.sessionUpdate === "subagent_spawned") {
    return {
      sessionId,
      update: {
        sessionUpdate: "subagent_spawned",
        subagentSessionId,
        name: optionalString(update.name),
        task: optionalString(update.task),
        prompt: optionalString(update.prompt),
      },
    };
  }
  if (update.sessionUpdate === "subagent_state_update" && typeof update.state === "string") {
    return {
      sessionId,
      update: { sessionUpdate: "subagent_state_update", subagentSessionId, state: update.state },
    };
  }
  return null;
}
