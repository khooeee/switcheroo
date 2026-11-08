import type { VoiceLogEntry } from "../../../shared/voiceLogEntry";

/** Keep the list bounded during a long live session. */
const MAX_ENTRIES = 1000;

let entries: VoiceLogEntry[] | null = null;
let stop: (() => void) | null = null;
const listeners = new Set<() => void>();

function set(next: VoiceLogEntry[]): void {
  entries = next;
  listeners.forEach((listener) => listener());
}

/** Load the saved log, then append each new entry as it is written; returns the teardown. */
function start(): () => void {
  let stopped = false;
  // Entries that arrive while the saved log loads; dropped if the file already has them.
  let pending: VoiceLogEntry[] | null = [];
  const unsubscribe = window.switcheroo.onVoiceLogEntry((entry) => {
    if (pending) pending.push(entry);
    else set([...(entries ?? []), entry].slice(-MAX_ENTRIES));
  });
  void window.switcheroo
    .getVoiceLog()
    .catch(() => [])
    .then((saved) => {
      if (stopped) return;
      const lastAt = saved[saved.length - 1]?.at ?? 0;
      const fresh = (pending ?? []).filter((entry) => entry.at > lastAt);
      pending = null;
      set([...saved, ...fresh]);
    });
  return () => {
    stopped = true;
    unsubscribe();
    entries = null;
  };
}

/** Voice log entries shared by the Voice Log and its Turn Details rail; loaded while anything subscribes (null while loading). */
export const voiceLogEntries = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    stop ??= start();
    return () => {
      listeners.delete(listener);
      if (listeners.size) return;
      stop?.();
      stop = null;
    };
  },

  getSnapshot(): VoiceLogEntry[] | null {
    return entries;
  },
};
