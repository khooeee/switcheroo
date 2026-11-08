const SESSION = {
  type: "string",
  description:
    "Which session, as the user said it (title words, project, or a number from list_sessions). Omit for the session already being discussed.",
};

function tool(name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []) {
  return { type: "function", name, description, parameters: { type: "object", properties, required } };
}

/** Function tools in `session.update`; names match runVoiceTool's handlers. */
export const voiceToolDefs = [
  tool("list_sessions", "List coding sessions: every working one plus the most recent, numbered."),
  tool("get_session", "One session's status, what it is doing now, its last result and any open question.", { session: SESSION }),
  tool("read_turns", "The session's last few prompts and replies, when the user wants more than the last result.", {
    session: SESSION,
    count: { type: "integer", description: "How many recent turns (1–10). Default 3." },
  }),
  tool(
    "send_prompt",
    "Send the user's instruction to a coding session. Keep the user's words and intent; do not expand the task. Steers or queues if the session is busy.",
    { session: SESSION, text: { type: "string", description: "The instruction, close to what the user said." } },
    ["text"],
  ),
  tool(
    "create_session",
    "Start a new coding session in a project the user already works in, and send it the first prompt if the user gave a task.",
    {
      project: { type: "string", description: "Project folder name as the user said it. Omit to use the current project." },
      prompt: { type: "string", description: "The task, close to what the user said. Omit when the user only asked for a new session." },
      agent: { type: "string", description: "Claude Code, Codex, Cursor or Pi. Omit for the user's usual agent." },
      title: { type: "string", description: "Short session title. Omit to derive one from the prompt." },
    },
  ),
  tool("stop_session", "Stop the session's running turn. The session and its work stay.", { session: SESSION }),
  tool("show_session", "Switch the screen to a session. Only when the user asks to see it.", { session: SESSION }),
  tool("update_session", "Rename (replaces the whole title), pin or unpin a session.", {
    session: SESSION,
    title: { type: "string" },
    pinned: { type: "boolean" },
  }),
  tool("answer_question", "Answer an agent's open multiple-choice question with option ids from get_session or the notice.", {
    session: SESSION,
    answers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question_id: { type: "string" },
          option_ids: { type: "array", items: { type: "string" } },
        },
        required: ["question_id", "option_ids"],
      },
    },
    skip: { type: "boolean", description: "True to skip the question instead." },
  }),
  tool(
    "web_search",
    "Search the web for current or very specific facts. Runs in the background; say a short filler, and the answer arrives as a notice.",
    {
      query: { type: "string" },
      depth: { type: "string", enum: ["quick", "deep"], description: "deep for hard questions or 'look into it'. Default quick." },
    },
    ["query"],
  ),
  tool("stop_voice", "Turn voice off when the user says to stop listening, go to sleep, or goodbye."),
];
