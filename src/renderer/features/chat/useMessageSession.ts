import { useMemo } from "react";
import type { Session } from "../../../shared/session";

/** The session fields transcript rows read. */
export type MessageSession = Pick<Session, "id" | "agent" | "cwd" | "supportsForkAtMessage">;

/**
 * Narrow `session` to what transcript rows need, stable across unrelated session updates
 * (status, usage, tabs) so memoized rows do not re-render.
 */
export function useMessageSession(session: Session): MessageSession;
export function useMessageSession(session: Session | undefined): MessageSession | undefined;
export function useMessageSession(session: Session | undefined): MessageSession | undefined {
  const id = session?.id;
  const agent = session?.agent;
  const cwd = session?.cwd;
  const supportsForkAtMessage = session?.supportsForkAtMessage;
  return useMemo(
    () =>
      id === undefined || agent === undefined || cwd === undefined
        ? undefined
        : { id, agent, cwd, supportsForkAtMessage },
    [id, agent, cwd, supportsForkAtMessage],
  );
}
