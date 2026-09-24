import { useEffect } from "react";

export function useFocusPromptShortcut(enabled: boolean, focusPrompt: () => void) {
  useEffect(() => {
    const run = () => {
      if (!enabled) return;
      focusPrompt();
    };
    const onKey = (event: KeyboardEvent) => {
      if (!enabled || event.defaultPrevented || event.isComposing || event.repeat) return;
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== "i") return;
      event.preventDefault();
      run();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("switcheroo:focus-prompt", run);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("switcheroo:focus-prompt", run);
    };
  }, [enabled, focusPrompt]);
}
