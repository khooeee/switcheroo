import type { FileChange } from "../../shared/fileChange";
import type { Session } from "../../shared/session";
import type { TranscriptItem, TranscriptTurn } from "../../shared/transcript";

/**
 * Named response shapes referenced by route `response` fields in GET /.
 * `satisfies` keeps each field list in step with the shared types.
 */
export const controlResponseTypes = {
  Error: {
    error: "string — message (400 invalid input, 401 missing/wrong token, 404 unknown route or session)",
  },
  Session: {
    id: "string — Switcheroo session id used in /sessions/:id routes",
    title: "string",
    agent: "claude | codex | cursor | pi | prime",
    cwd: "string — absolute workspace path",
    agentSessionId: "string | null — ACP agent session id (not the Switcheroo id)",
    status: "idle | connecting | ready | running | error",
    error: "string | null — set when status is error",
    createdAt: "number — epoch ms",
    supportsSteering: "optional boolean",
    supportsFork: "optional boolean",
    supportsForkAtMessage: "optional boolean",
    slashCommands: "optional { name, description, hint? }[]",
    usage: "optional { used, size, cost?: { amount, currency } } — context window tokens",
    tabs: "{ tabId, kind: \"terminal\", title, cwd }[] — child tabs",
    tabsExpanded: "boolean — UI rail state",
  } satisfies Record<keyof Session, string>,
  TranscriptTurn: {
    id: "string — the turnId returned by POST /sessions/:id/prompt",
    at: "number — epoch ms of the user message",
    status: "running | complete | stopped",
    user: "TranscriptItem — the prompt",
    assistant: "TranscriptItem | null — latest assistant reply (read .text)",
    events: "TranscriptItem[] — thoughts, tool calls, earlier assistant messages",
    fileChanges: "FileChange[] — aggregated from tool events",
  } satisfies Record<keyof TranscriptTurn, string>,
  TranscriptItem: {
    id: "string",
    role: "user | assistant | thought | tool | system | stopped | subagent",
    text: "string",
    at: "number — epoch ms",
    queued: "optional boolean — waiting behind an in-flight prompt",
    toolCallId: "optional string",
    toolStatus: "optional string",
    toolTitle: "optional string",
    fileChanges: "optional FileChange[]",
    images: "optional string[] — saved image file names (tool rows)",
    subagentId: "optional string — subagent rows",
  } satisfies Record<keyof TranscriptItem, string>,
  FileChange: {
    path: "string",
    kind: "created | updated | deleted | moved",
    oldText: "optional string | null",
    newText: "optional string | null",
  } satisfies Record<keyof FileChange, string>,
};
