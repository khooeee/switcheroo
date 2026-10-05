import type { AcpSession } from "./session";

/** Routes session/update notifications to the AcpSession that owns that session id. */
const sessionsById = new Map<string, AcpSession>();

export const sessionRoutes = {
  register(sessionId: string, session: AcpSession): void {
    sessionsById.set(sessionId, session);
  },

  unregister(sessionId: string | null): void {
    if (sessionId) sessionsById.delete(sessionId);
  },

  /**
   * Resolve which AcpSession should handle a session/update.
   * Only follow a registered id when it shares this connection (fork siblings).
   * Otherwise keep the connection's own session — a global id match can point at
   * the warm-pool husk and silently drop the live turn's assistant text.
   */
  forUpdate(sessionId: string, fallback: AcpSession): AcpSession {
    const target = sessionsById.get(sessionId);
    if (target && target.isSameAgentConnection(fallback)) return target;
    return fallback;
  },
};
