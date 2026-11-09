import { errorMessage } from "../../shared/errorMessage";
import type { SessionManager } from "../sessions/SessionManager";
import { parseCreateSession } from "../control/parseCreateSession";
import { sessionSummary } from "./sessionSummary";
import { waitForSessions } from "./waitForSessions";

type Args = Record<string, unknown>;
type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

/** The sidebar can hold hundreds of sessions (sessionListMax); list only the top ones by default. */
const LIST_LIMIT = 20;

function text(args: Args, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`${key} is required`);
  return value;
}

function optionalNumber(args: Args, key: string): number | undefined {
  const value = args[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** The session another tool acts on; prompting or stopping the caller itself is refused. */
function otherSession(callerId: string, args: Args): string {
  const sessionId = text(args, "sessionId");
  if (sessionId === callerId) throw new Error("That is this session; act on another one.");
  return sessionId;
}

function knownSession(sessions: SessionManager, args: Args): string {
  const sessionId = text(args, "sessionId");
  if (!sessions.getSession(sessionId)) throw new Error("Session not found");
  return sessionId;
}

async function run(sessions: SessionManager, callerId: string, name: string, args: Args, signal: AbortSignal) {
  const summary = (id: string) => {
    const session = sessions.getSessionPayload(id);
    if (!session) throw new Error("Session not found");
    return sessionSummary(session, callerId);
  };
  switch (name) {
    case "list_sessions": {
      const limit = Math.max(1, Math.floor(optionalNumber(args, "limit") ?? LIST_LIMIT));
      const { pinned, unpinned } = sessions.list();
      const all = [...pinned, ...unpinned];
      // The caller always sees itself, so it can find its own id.
      const shown = all.filter((session, index) => index < limit || session.id === callerId);
      return {
        sessions: shown.map((session) => ({
          ...sessionSummary(session, callerId),
          ...(pinned.includes(session) ? { pinned: true } : {}),
        })),
        total: all.length,
      };
    }
    case "create_session": {
      const prompt = typeof args.prompt === "string" && args.prompt.trim() ? args.prompt : undefined;
      // Agents create children in the background; keep the user's current view.
      const session = await sessions.createSession({ ...parseCreateSession(args), prompt }, { focus: false });
      return summary(session.id);
    }
    case "send_prompt": {
      const sessionId = otherSession(callerId, args);
      const turnId = await sessions.enqueuePrompt(sessionId, text(args, "text"));
      return { sessionId, turnId };
    }
    case "wait_for_sessions": {
      const ids = Array.isArray(args.sessionIds) ? args.sessionIds.filter((id) => typeof id === "string") : [];
      if (ids.length === 0) throw new Error("sessionIds is required");
      // The caller is mid-turn while it waits, so waiting on itself never finishes.
      if (ids.includes(callerId)) throw new Error("sessionIds includes this session; wait on other ones.");
      return waitForSessions(sessions, ids, optionalNumber(args, "timeoutSeconds"), signal);
    }
    case "read_transcript": {
      const sessionId = knownSession(sessions, args);
      const last = Math.max(1, Math.floor(optionalNumber(args, "last") ?? 1));
      const turns = (await sessions.getTranscript(sessionId)).slice(-last);
      return turns.map((turn) => ({
        turnId: turn.id,
        status: turn.status,
        prompt: turn.user.text,
        reply: turn.assistant?.text ?? null,
      }));
    }
    case "update_session": {
      const sessionId = args.sessionId === undefined ? callerId : knownSession(sessions, args);
      const pinned = typeof args.pinned === "boolean" ? args.pinned : undefined;
      if (args.title === undefined && pinned === undefined) throw new Error("title or pinned is required");
      if (args.title !== undefined) sessions.renameSession(sessionId, text(args, "title").trim());
      if (pinned === true) sessions.pinSession(sessionId);
      if (pinned === false) sessions.unpinSession(sessionId);
      return { ...summary(sessionId), ...(pinned === undefined ? {} : { pinned }) };
    }
    case "cancel_session": {
      const sessionId = otherSession(callerId, args);
      await sessions.cancelPrompt(sessionId);
      return { sessionId, cancelled: true };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/** Run one Switcheroo tool for the calling session; failures become tool errors the agent can read. */
export async function callSwitcherooTool(
  sessions: SessionManager,
  callerId: string,
  name: string,
  args: Args,
  signal: AbortSignal,
): Promise<ToolResult> {
  try {
    const result = await run(sessions, callerId, name, args, signal);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (error) {
    return { content: [{ type: "text", text: errorMessage(error) }], isError: true };
  }
}
