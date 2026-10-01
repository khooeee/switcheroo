import type { AcpSession } from "./session";

/** Routes session/update notifications to the AcpSession that owns that session id. */
const sessionsById = new Map<string, AcpSession>();

export function registerSessionRoute(sessionId: string, session: AcpSession): void {
  sessionsById.set(sessionId, session);
}

export function unregisterSessionRoute(sessionId: string | null): void {
  if (sessionId) sessionsById.delete(sessionId);
}

export function sessionForUpdate(sessionId: string, fallback: AcpSession): AcpSession {
  return sessionsById.get(sessionId) ?? fallback;
}
