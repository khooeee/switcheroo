import { useEffect, useState } from "react";
import type { VoiceLogEntry } from "../../../shared/voiceLogEntry";

/** Keep the list bounded during a long live session. */
const MAX_ENTRIES = 1000;

/** Recent voice log entries, then each new one as it is written; null while loading. */
export function useVoiceLog(): VoiceLogEntry[] | null {
  const [entries, setEntries] = useState<VoiceLogEntry[] | null>(null);

  useEffect(() => {
    // Entries that arrive while the saved log loads; dropped if the file already has them.
    let pending: VoiceLogEntry[] | null = [];
    const unsubscribe = window.switcheroo.onVoiceLogEntry((entry) => {
      if (pending) pending.push(entry);
      else setEntries((prev) => [...(prev ?? []), entry].slice(-MAX_ENTRIES));
    });
    void window.switcheroo
      .getVoiceLog()
      .catch(() => [])
      .then((saved) => {
        const lastAt = saved[saved.length - 1]?.at ?? 0;
        const fresh = (pending ?? []).filter((entry) => entry.at > lastAt);
        pending = null;
        setEntries([...saved, ...fresh]);
      });
    return unsubscribe;
  }, []);

  return entries;
}
