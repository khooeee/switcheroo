import { useEffect } from "react";

/** Bind a Cmd/Ctrl[+Shift]+key shortcut and a matching window CustomEvent to a focus action. */
export function useFocusShortcut({
  enabled,
  key,
  shift = false,
  eventName,
  onFocus,
}: {
  enabled: boolean;
  key: string;
  shift?: boolean;
  eventName: string;
  onFocus: () => void;
}) {
  useEffect(() => {
    const run = () => {
      if (!enabled) return;
      onFocus();
    };
    const onKey = (event: KeyboardEvent) => {
      if (!enabled || event.defaultPrevented || event.isComposing || event.repeat) return;
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (event.shiftKey !== shift) return;
      if (event.key.toLowerCase() !== key) return;
      event.preventDefault();
      run();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(eventName, run);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(eventName, run);
    };
  }, [enabled, key, shift, eventName, onFocus]);
}
