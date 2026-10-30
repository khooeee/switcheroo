import { useEffect } from "react";
import type { SaveMarkdownView } from "../../../shared/saveMarkdownView";

/** Saves this panel's markdown on `switcheroo:save-view-markdown` for `view` (context menu, sent from main via preload). */
export function useSaveViewMarkdownEvent(
  view: SaveMarkdownView,
  getMarkdown: () => string,
  nameHint: string,
): void {
  useEffect(() => {
    const onSave = (event: Event) => {
      if ((event as CustomEvent<SaveMarkdownView>).detail !== view) return;
      void window.switcheroo.saveMarkdown(getMarkdown(), nameHint).catch(console.error);
    };
    window.addEventListener("switcheroo:save-view-markdown", onSave);
    return () => window.removeEventListener("switcheroo:save-view-markdown", onSave);
  }, [view, getMarkdown, nameHint]);
}
