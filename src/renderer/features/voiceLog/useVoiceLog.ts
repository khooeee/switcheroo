import { useSyncExternalStore } from "react";
import type { VoiceLogEntry } from "../../../shared/voiceLogEntry";
import { voiceLogEntries } from "./voiceLogEntries";

/** Recent voice log entries, then each new one as it is written; null while loading. */
export function useVoiceLog(): VoiceLogEntry[] | null {
  return useSyncExternalStore(voiceLogEntries.subscribe, voiceLogEntries.getSnapshot);
}
