import { useCallback, useEffect, useRef, useState } from "react";

/** Copies text to the clipboard and reports `copied` for a brief confirmation window. */
export function useCopiedFlash(durationMs = 1500): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
  }, []);

  const copy = useCallback((text: string) => {
    void navigator.clipboard.writeText(text).catch(console.error);
    setCopied(true);
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopied(false), durationMs);
  }, [durationMs]);

  return [copied, copy];
}
