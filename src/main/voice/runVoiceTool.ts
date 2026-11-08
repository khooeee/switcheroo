import { errorMessage } from "../../shared/errorMessage";
import { answerQuestionTool } from "./tools/answerQuestionTool";
import { createSessionTool } from "./tools/createSessionTool";
import { getSessionTool } from "./tools/getSessionTool";
import { listSessionsTool } from "./tools/listSessionsTool";
import { readTurnsTool } from "./tools/readTurnsTool";
import { sendPromptTool } from "./tools/sendPromptTool";
import { showSessionTool } from "./tools/showSessionTool";
import { sleepTool } from "./tools/sleepTool";
import { stopSessionTool } from "./tools/stopSessionTool";
import { updateSessionTool } from "./tools/updateSessionTool";
import { webSearchTool } from "./tools/webSearchTool";
import { toolArgs } from "./toolArgs";
import type { VoiceToolContext } from "./VoiceToolContext";

type Handler = (ctx: VoiceToolContext, args: Record<string, unknown>) => Promise<unknown>;

const HANDLERS: Record<string, Handler> = {
  list_sessions: listSessionsTool,
  get_session: getSessionTool,
  read_turns: readTurnsTool,
  send_prompt: sendPromptTool,
  create_session: createSessionTool,
  stop_session: stopSessionTool,
  show_session: showSessionTool,
  update_session: updateSessionTool,
  answer_question: answerQuestionTool,
  web_search: webSearchTool,
  sleep: sleepTool,
};

/** Tools that change sessions; refused unless the user's own speech triggered the response. */
const CHANGES_SESSIONS = new Set(["send_prompt", "create_session", "stop_session", "update_session", "answer_question"]);

const MAX_OUTPUT = 3000;

/** Run one tool call and return the `function_call_output` string. */
export async function runVoiceTool(
  ctx: VoiceToolContext,
  name: string,
  rawArgs: string,
  trigger: "user" | "notice",
): Promise<string> {
  const handler = HANDLERS[name];
  let result: unknown;
  if (!handler) {
    result = { ok: false, error: `Unknown tool ${name}.` };
  } else if (trigger === "notice" && CHANGES_SESSIONS.has(name)) {
    result = {
      ok: false,
      error: "Refused: a Switcheroo notice triggered this response, not the user. Ask the user, and act only on their spoken answer.",
    };
  } else {
    try {
      result = await handler(ctx, toolArgs.parse(rawArgs));
    } catch (error) {
      result = { ok: false, error: errorMessage(error) };
    }
  }
  const output = JSON.stringify(result);
  return output.length > MAX_OUTPUT ? `${output.slice(0, MAX_OUTPUT)}…(truncated)` : output;
}
