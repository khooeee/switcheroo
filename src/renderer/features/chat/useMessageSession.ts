import { useMemo } from "react";
import type { Session } from "../../../shared/session";

/** The session fields transcript rows read. */
export type MessageSession = Pick<Session, "id" | "agent" | "cwd" | "supportsForkAtMessage">;

/**
 * Narrow `session` to what transcript rows need, stable across unrelated session updates
 * (status, usage) so memoized rows do not re-render.
 */
export function useMessageSession(session: Session): MessageSession {
  const { id, agent, cwd, supportsForkAtMessage } = session;
  return useMemo(
    () => ({ id, agent, cwd, supportsForkAtMessage }),
    [id, agent, cwd, supportsForkAtMessage],
  );
}
