import * as path from "node:path";
import { AGENT_LABELS } from "../../shared/agentLabels";
import type { Session } from "../../shared/session";
import { listPosition } from "./listPosition";
import { sessionLabel } from "./sessionLabel";
import { spokenMatchScore } from "./spokenMatchScore";

type Resolved = { ok: true; session: Session } | { ok: false; error: string; candidates?: string[] };

const ACTIVE_REFS = /^(active|current|this|this one|open|selected|on screen)$/i;
const MIN_SCORE = 30;

/**
 * Turn a spoken session reference into a session. Empty refs use `fallbackIds` (last discussed,
 * then on screen); numbers index `numbered` (the last list_sessions order); names are fuzzy-matched.
 */
export function resolveSessionRef(
  sessions: Session[],
  ref: string | undefined,
  fallbackIds: Array<string | null>,
  numbered: string[],
): Resolved {
  const byId = (id: string | null | undefined) => (id ? sessions.find((session) => session.id === id) : undefined);
  const spoken = ref?.trim() ?? "";
  if (!spoken) {
    const session = fallbackIds.map(byId).find(Boolean);
    return session ? { ok: true, session } : { ok: false, error: "No session is in focus. Ask which one." };
  }
  if (ACTIVE_REFS.test(spoken)) {
    const session = byId(fallbackIds[fallbackIds.length - 1]);
    return session ? { ok: true, session } : { ok: false, error: "No session is on screen." };
  }
  const direct = byId(spoken);
  if (direct) return { ok: true, session: direct };
  const position = listPosition(spoken);
  if (position !== null) {
    const session = byId(numbered[position - 1]);
    if (session) return { ok: true, session };
  }

  const ranked = sessions
    .map((session) => ({
      session,
      score: spokenMatchScore(spoken, sessionLabel(session), `${session.title} ${path.basename(session.cwd)} ${AGENT_LABELS[session.agent]}`),
    }))
    .filter((entry) => entry.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score);
  const [best, second] = ranked;
  if (!best) {
    return {
      ok: false,
      error: `No session matches "${spoken}".`,
      candidates: sessions.slice(0, 5).map(sessionLabel),
    };
  }
  if (second && best.score < 100 && second.score >= best.score - 5) {
    return {
      ok: false,
      error: `"${spoken}" matches more than one session. Ask which.`,
      candidates: ranked.slice(0, 4).map((entry) => sessionLabel(entry.session)),
    };
  }
  return { ok: true, session: best.session };
}
