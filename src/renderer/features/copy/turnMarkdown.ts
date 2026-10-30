import type { TranscriptItem, TranscriptTurn } from "../../../shared/transcript";
import { stripCursorStreamNoise } from "../../../shared/cursorStreamNoise";

/** Roles written as-is; tool and system output goes in a code fence. */
const UNFENCED_ROLES = new Set(["user", "assistant", "thought", "subagent"]);

/** One turn as markdown: each message under a `## Role · time` heading. */
export function turnMarkdown(
  turn: TranscriptTurn,
  { agent, userLabel = "user" }: { agent?: string; userLabel?: string },
): string {
  const sections = [itemSection(turn.user, agent, userLabel)];
  for (const item of turn.events) sections.push(itemSection(item, agent, item.role));
  if (turn.assistant) sections.push(itemSection(turn.assistant, agent, "assistant"));
  else if (turn.status === "stopped") sections.push("_Stopped_");
  return sections.filter(Boolean).join("\n\n");
}

function itemSection(item: TranscriptItem, agent: string | undefined, label: string): string {
  const text = stripCursorStreamNoise(agent, item.text).trim();
  const task = item.subagentId ? item.toolTitle?.trim() : undefined;
  if (!text && !task) return "";
  const status = item.toolStatus ? ` (${item.toolStatus})` : "";
  const heading = `## ${label.charAt(0).toUpperCase()}${label.slice(1)}${status} · ${new Date(item.at).toLocaleString()}`;
  const body = !text ? "" : UNFENCED_ROLES.has(item.role) ? text : fenced(text);
  return [heading, body, task].filter(Boolean).join("\n\n");
}

/** Code fence one backtick longer than any run inside `text`, so the text cannot close it. */
function fenced(text: string): string {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(longest + 1);
  return `${fence}\n${text}\n${fence}`;
}
