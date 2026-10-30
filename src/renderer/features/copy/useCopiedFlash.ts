import { useCallback } from "react";
import { useFlash } from "./useFlash";

/** Copies text to the clipboard and reports `copied` for a brief confirmation window. */
export function useCopiedFlash(durationMs = 1500): [boolean, (text: string) => void] {
  const [copied, flash] = useFlash<true>(durationMs);

  const copy = useCallback((text: string) => {
    void navigator.clipboard.writeText(text).catch(console.error);
    flash(true);
  }, [flash]);

  return [!!copied, copy];
}
