import type { AgentKind } from "./agentKind";

const CURSOR_STREAM_NOISE = /\n*Error: RetriableError: WritableIterable is closed\s*$/;

/** Cursor ACP appends this internal stream error as assistant text after a successful turn. Other agents' text is returned as is. */
export function stripCursorStreamNoise(agent: AgentKind, text: string): string {
  return agent === "cursor" ? text.replace(CURSOR_STREAM_NOISE, "") : text;
}
