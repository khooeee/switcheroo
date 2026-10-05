import type { Session } from "../shared/session";
import type { SessionMeta } from "./sessionMeta";

export function sessionFromMeta(id: string, meta: SessionMeta | null): Session {
  return {
    id,
    title: meta?.title || id,
    agent: meta?.agent ?? "claude",
    cwd: meta?.cwd ?? "",
    agentSessionId: meta?.agentSessionId ?? null,
    status: "idle",
    error: null,
    createdAt: Date.now(),
    usage: meta?.usage,
    tabs: meta?.tabs ?? [],
    tabsExpanded: meta?.tabsExpanded ?? true,
  };
}
