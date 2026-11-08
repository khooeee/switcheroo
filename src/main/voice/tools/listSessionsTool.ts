import * as path from "node:path";
import { AGENT_LABELS } from "../../../shared/agentLabels";
import { clipText } from "../clipText";
import { railSessions } from "../railSessions";
import { sessionLabel } from "../sessionLabel";
import { spokenStatus } from "../spokenStatus";
import type { VoiceToolContext } from "../VoiceToolContext";

const RECENT = 15;

/** Rail sessions (all working ones plus the most recent), numbered for "the second one". */
export async function listSessionsTool(ctx: VoiceToolContext): Promise<unknown> {
  const all = railSessions(ctx.sessions);
  const { pinned, activeTabId } = ctx.sessions.list();
  const pinnedIds = new Set(pinned.map((session) => session.id));
  const asking = new Set([...ctx.questions.values()].map((request) => request.sessionId));
  const shown = all.filter((session, index) => index < RECENT || session.status === "running");
  ctx.focus.numbered = shown.map((session) => session.id);
  return {
    total: all.length,
    sessions: shown.map((session, index) => ({
      n: index + 1,
      title: sessionLabel(session),
      project: path.basename(session.cwd),
      agent: AGENT_LABELS[session.agent],
      status: spokenStatus(session.status),
      ...(pinnedIds.has(session.id) ? { pinned: true } : {}),
      ...(session.id === activeTabId ? { onScreen: true } : {}),
      ...(asking.has(session.id) ? { waitingForAnswer: true } : {}),
      ...(session.cron ? { cron: true } : {}),
      ...(session.error ? { error: clipText(session.error, 120) } : {}),
    })),
  };
}
