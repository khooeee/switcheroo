import type { VoiceLogEntry } from "../../../shared/voiceLogEntry";

/** Entries the Voice Log shows inline; tool calls, searches, notices and token usage live in Turn Details. */
export function isVoiceLogMainEntry(entry: VoiceLogEntry): boolean {
  return entry.kind === "heard" || entry.kind === "said" || entry.kind === "error" || entry.kind === "state";
}
