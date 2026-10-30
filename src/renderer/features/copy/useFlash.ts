import { useCallback, useEffect, useRef, useState } from "react";

/** A value that `flash` sets and that resets to null after `durationMs`. */
export function useFlash<T>(durationMs = 1500): [T | null, (value: T) => void] {
  const [value, setValue] = useState<T | null>(null);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
  }, []);

  const flash = useCallback((next: T) => {
    setValue(next);
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setValue(null), durationMs);
  }, [durationMs]);

  return [value, flash];
}
