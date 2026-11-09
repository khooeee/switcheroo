const sessionId = { type: "string", description: "Switcheroo session id" };

function tool(name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []) {
  return { name, description, inputSchema: { type: "object", properties, required } };
}

/** Tools an aware session gets from Switcheroo's MCP server; `callSwitcherooTool` runs them. */
export const SWITCHEROO_TOOLS = [
  tool("list_sessions", "List the sessions in Switcheroo's sidebar, pinned first."),
  tool(
    "create_session",
    "Start a new agent session in the background, optionally with a first prompt. Returns at once with the session; keep its id and track children by id, never by title.",
    {
      agent: { type: "string", enum: ["claude", "codex", "cursor", "pi"] },
      cwd: { type: "string", description: "Absolute workspace path" },
      title: { type: "string" },
      prompt: { type: "string", description: "First prompt; returns without waiting for the reply" },
      switcherooAware: { type: "boolean", description: "Give the new session these tools too" },
      pin: { type: "boolean", description: "Pin it at the top of the sidebar" },
    },
    ["agent", "cwd"],
  ),
  tool("get_session", "Get one session, including its status (connecting, ready, running or error).", { sessionId }, ["sessionId"]),
  tool(
    "send_prompt",
    "Send a prompt to another session. Returns once it is accepted, without waiting for the reply; a busy session steers or queues it. Keep working and collect replies later with wait_for_sessions.",
    { sessionId, text: { type: "string" } },
    ["sessionId", "text"],
  ),
  tool(
    "wait_for_sessions",
    "Wait until the sessions finish their current turns, up to timeoutSeconds (at most 45), then report each one's status and, once finished, its latest reply. Call again for any still running.",
    {
      sessionIds: { type: "array", items: { type: "string" } },
      timeoutSeconds: { type: "number", description: "Default and maximum 45" },
    },
    ["sessionIds"],
  ),
  tool(
    "read_transcript",
    "Read a session's latest turns: each prompt and the final assistant reply.",
    { sessionId, last: { type: "number", description: "How many recent turns; default 1" } },
    ["sessionId"],
  ),
  tool(
    "rename_session",
    "Rename a session, including this one. Titles can be multiline, and URLs in them become links.",
    { sessionId, title: { type: "string" } },
    ["sessionId", "title"],
  ),
  tool("pin_session", "Pin or unpin a session in the sidebar.", { sessionId, pinned: { type: "boolean" } }, ["sessionId", "pinned"]),
  tool("cancel_session", "Stop another session's running turn.", { sessionId }, ["sessionId"]),
  tool(
    "close_session",
    "Close another session once you are done with it; it leaves the sidebar and its history stays on disk.",
    { sessionId },
    ["sessionId"],
  ),
];
