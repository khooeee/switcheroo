import type { VoiceLogEntry } from "../../../shared/voiceLogEntry";

const NOTICE_HEADER = /^\[switcheroo notice: not from the user\]\s*/;

function str(value: unknown): string {
  return typeof value === "string" ? value : value === undefined ? "" : JSON.stringify(value);
}

/** Tool args/output are JSON strings; show them as indented JSON when they parse. */
function pretty(raw: unknown): string {
  const text = str(raw);
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function stateText(entry: VoiceLogEntry): string {
  if (typeof entry.idleMinutes === "number") return `No speech for ${entry.idleMinutes} min`;
  if (entry.state === "listening") {
    const reasoning = typeof entry.reasoning === "string" ? ` (reasoning ${entry.reasoning.toLowerCase()})` : "";
    return `${entry.reconnected ? "Voice reconnected" : "Voice on"}${reasoning}`;
  }
  if (entry.state === "off") return "Voice off";
  return `Voice ${str(entry.state)}`;
}

function tokens(value: unknown): string {
  return typeof value === "number" ? value.toLocaleString() : "?";
}

function usageText(entry: VoiceLogEntry): string {
  const reasoning = typeof entry.reasoning === "number" ? `${tokens(entry.reasoning)} reasoning · ` : "";
  return `Tokens: ${tokens(entry.input)} input · ${reasoning}${tokens(entry.output)} output`;
}

/** How one voice log entry renders: a transcript-style message, a divider, or nothing (redundant entries). */
export function voiceLogRowContent(entry: VoiceLogEntry) {
  switch (entry.kind) {
    case "heard":
      return { type: "message", role: "user", label: "you", text: str(entry.text), markdown: true } as const;
    case "said":
      return { type: "message", role: "assistant", label: "voice", text: str(entry.text), markdown: true } as const;
    case "notice":
      return {
        type: "message",
        role: "voice-aside",
        label: "notice",
        text: str(entry.text).replace(NOTICE_HEADER, ""),
        markdown: true,
      } as const;
    case "error":
      return {
        type: "message",
        role: "voice-aside",
        label: "error",
        pill: "error",
        status: entry.query ? `search: ${str(entry.query)}` : undefined,
        text: str(entry.error),
        markdown: false,
      } as const;
    case "state":
      return { type: "divider", text: stateText(entry) } as const;
    case "usage":
      return { type: "divider", text: usageText(entry) } as const;
    case "tool":
      break;
  }
  // The web_search tool row already shows the query; its answer arrives as web_search:done.
  if (entry.name === "web_search:start") return null;
  if (entry.name === "web_search:done") {
    const sources = Array.isArray(entry.sources) ? entry.sources.map(str).join(", ") : "";
    return {
      type: "message",
      role: "voice-aside",
      label: "search",
      pill: "tool",
      status: str(entry.query),
      text: str(entry.answer),
      markdown: true,
      detail: sources ? `Sources: ${sources}` : undefined,
    } as const;
  }
  return {
    type: "message",
    role: "voice-aside",
    label: "tool",
    pill: "tool",
    status: entry.trigger === "notice" ? `${str(entry.name)} (from a notice)` : str(entry.name),
    text: pretty(entry.args),
    markdown: false,
    detail: entry.output === undefined ? undefined : pretty(entry.output),
  } as const;
}
