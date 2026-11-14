import * as path from "node:path";
import { AGENT_LABELS } from "../../../shared/agentLabels";
import { agentTurns } from "../../../shared/agentTurns";
import { clipText } from "../../../shared/clipText";
import { questionPayload } from "../questionPayload";
import { resolveToolSession } from "../resolveToolSession";
import { sessionLabel } from "../sessionLabel";
import { spokenStatus } from "../spokenStatus";
import { toolArgs } from "../toolArgs";
import { turnSnapshot } from "../turnSnapshot";
import type { VoiceToolContext } from "../VoiceToolContext";

/** One session's status, current step, last result and any open question. */
export async function getSessionTool(ctx: VoiceToolContext, args: Record<string, unknown>): Promise<unknown> {
  const resolved = resolveToolSession(ctx, toolArgs.string(args, "session"));
  if (!resolved.ok) return resolved;
  const { session } = resolved;
  const turns = agentTurns(await ctx.sessions.getTranscript(session.id));
  const latest = turns[turns.length - 1];
  const finished = [...turns].reverse().find((turn) => turn.status !== "running");
  const question = [...ctx.questions.values()].find((request) => request.sessionId === session.id);
  return {
    title: sessionLabel(session),
    project: path.basename(session.cwd),
    agent: AGENT_LABELS[session.agent],
    status: spokenStatus(session.status),
    ...(session.error ? { error: clipText(session.error, 200) } : {}),
    ...(latest?.status === "running" ? { current: turnSnapshot(latest, 0) } : {}),
    ...(finished ? { lastResult: turnSnapshot(finished, 1200) } : {}),
    ...(question ? { question: questionPayload(question) } : {}),
    ...(turns.length ? {} : { note: "No prompts yet." }),
  };
}
