import type { VoiceLogEntry } from "../../../shared/voiceLogEntry";

type VoiceTurns = {
  /** Turn id per entry index; null for state dividers, which belong to no turn. */
  turnOf: (string | null)[];
  /** Each turn's entries in order, by turn id. */
  turns: Map<string, VoiceLogEntry[]>;
};

/** A finished (or failed) web search whose answer arrives later as a notice. */
function endsSearch(entry: VoiceLogEntry): boolean {
  return (entry.kind === "tool" && entry.name === "web_search:done") || (entry.kind === "error" && !!entry.query);
}

/**
 * Split the log into turns: each starts when the user speaks or a Switcheroo notice arrives,
 * except a web search's answer notice, which stays with the turn that asked. "Voice on" ends a turn.
 */
export function groupVoiceTurns(entries: VoiceLogEntry[]): VoiceTurns {
  const turnOf: (string | null)[] = [];
  const turns = new Map<string, VoiceLogEntry[]>();
  let current: VoiceLogEntry[] | null = null;
  let currentId: string | null = null;
  let searchAnswerDue = false;

  for (const entry of entries) {
    if (entry.kind === "state") {
      // "Voice off" can be logged before the tool call that turned it off, so only "Voice on" ends a turn.
      if (entry.state === "listening") {
        current = null;
        searchAnswerDue = false;
      }
      turnOf.push(null);
      continue;
    }
    if (!current || entry.kind === "heard" || (entry.kind === "notice" && !searchAnswerDue)) {
      // Timestamp-based, so ids survive the list being trimmed from the front.
      currentId = `${entry.at}:${entry.kind}`;
      current = [];
      turns.set(currentId, current);
      searchAnswerDue = false;
    }
    current.push(entry);
    turnOf.push(currentId);
    if (endsSearch(entry)) searchAnswerDue = true;
    else if (entry.kind === "notice") searchAnswerDue = false;
  }
  return { turnOf, turns };
}
