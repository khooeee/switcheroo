import { useEffect, useState } from "react";
import { errorMessage } from "../../../shared/errorMessage";
import type { PathEntry } from "./PathEntry";
import { pathEntries } from "./pathEntries";

interface Loaded {
  entries: readonly PathEntry[];
  error: string | null;
  loading: boolean;
}

const NONE: Loaded = { entries: [], error: null, loading: true };

/** The session's files and folders, re-read each time Go to File opens; the last list shows meanwhile. */
export function usePathEntries(sessionId: string, open: boolean): Loaded {
  const [loaded, setLoaded] = useState(NONE);
  useEffect(() => {
    if (!open) return;
    let stale = false;
    setLoaded((prev) => (prev.loading ? prev : { ...prev, loading: true }));
    window.switcheroo.listSessionFiles(sessionId).then(
      (files) => {
        if (!stale) setLoaded({ entries: pathEntries(files), error: null, loading: false });
      },
      (err) => {
        if (!stale) setLoaded({ entries: [], error: errorMessage(err), loading: false });
      },
    );
    return () => {
      stale = true;
    };
  }, [sessionId, open]);
  return loaded;
}
