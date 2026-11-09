import type { Session } from "../../shared/session";

/** What an agent needs to know about a session; `self` marks the caller's own. */
export function sessionSummary(session: Session, callerId: string) {
  return {
    id: session.id,
    title: session.title,
    agent: session.agent,
    cwd: session.cwd,
    status: session.status,
    ...(session.error ? { error: session.error } : {}),
    ...(session.id === callerId ? { self: true } : {}),
  };
}
