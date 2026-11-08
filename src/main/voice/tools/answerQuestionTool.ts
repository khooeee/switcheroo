import type { CursorAskQuestionRequest } from "../../../shared/agentRequests";
import { resolveToolSession } from "../resolveToolSession";
import { toolArgs } from "../toolArgs";
import type { VoiceToolContext } from "../VoiceToolContext";

type Question = CursorAskQuestionRequest["questions"][number];
type Found = { ok: true; request: CursorAskQuestionRequest } | { ok: false; error: string; candidates?: string[] };

/** The open question for the named session, else the focused one, else the only one. */
function findRequest(ctx: VoiceToolContext, sessionRef: string | undefined): Found {
  const open = [...ctx.questions.values()];
  if (!open.length) return { ok: false, error: "No agent is waiting for an answer." };
  if (!sessionRef && open.length === 1) return { ok: true, request: open[0]! };
  const resolved = resolveToolSession(ctx, sessionRef);
  if (!resolved.ok) return resolved;
  const request = open.find((entry) => entry.sessionId === resolved.session.id);
  return request ? { ok: true, request } : { ok: false, error: "That session has no open question." };
}

/** Option ids the model chose, matched by id or by label. */
function chosenIds(question: Question, picks: unknown): string[] {
  const list = Array.isArray(picks) ? picks : typeof picks === "string" ? [picks] : [];
  const ids = list
    .filter((pick): pick is string => typeof pick === "string")
    .map((pick) => question.options.find((option) => option.id === pick || option.label.toLowerCase() === pick.toLowerCase().trim())?.id)
    .filter((id): id is string => !!id);
  return question.allowMultiple ? [...new Set(ids)] : ids.slice(0, 1);
}

/** Select the asking session and answer (or skip) its Cursor agent's multiple-choice question. */
export async function answerQuestionTool(ctx: VoiceToolContext, args: Record<string, unknown>): Promise<unknown> {
  const found = findRequest(ctx, toolArgs.string(args, "session"));
  if (!found.ok) return found;
  const { request } = found;
  await ctx.sessions.setActiveTab(request.sessionId);
  if (toolArgs.boolean(args, "skip")) {
    ctx.sessions.respondAskQuestion(request.requestId, { outcome: "skipped", reason: "Skipped by voice" });
    ctx.questions.delete(request.requestId);
    return { ok: true, skipped: true };
  }
  const given = Array.isArray(args.answers) ? (args.answers as Array<Record<string, unknown>>) : [];
  const answers = request.questions.map((question) => {
    const match = given.find((entry) => entry?.question_id === question.id) ?? (request.questions.length === 1 ? given[0] ?? args : undefined);
    return { questionId: question.id, selectedOptionIds: chosenIds(question, match?.option_ids) };
  });
  const missing = answers.filter((answer) => !answer.selectedOptionIds.length).map((answer) => answer.questionId);
  if (missing.length) return { ok: false, error: `No valid option chosen for: ${missing.join(", ")}.` };
  ctx.sessions.respondAskQuestion(request.requestId, { outcome: "answered", answers });
  ctx.questions.delete(request.requestId);
  return { ok: true, answered: answers.length };
}
