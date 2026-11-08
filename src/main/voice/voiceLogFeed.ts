import type { VoiceLogEntry } from "../../shared/voiceLogEntry";

type Listener = (entry: VoiceLogEntry) => void;

const listeners = new Set<Listener>();

/** Voice log entries as they are written, for the renderer's live Voice Log view. */
export const voiceLogFeed = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  emit(entry: VoiceLogEntry): void {
    listeners.forEach((listener) => listener(entry));
  },
};
