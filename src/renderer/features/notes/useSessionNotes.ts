import { useCallback, useState } from "react";
import type { SessionTab } from "../../shared/types";
import { defaultNotesWidth } from "./clampNotesWidth";

export function useSessionNotes() {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [widths, setWidths] = useState<Record<string, number>>({});

  const hydrate = useCallback((tabs: SessionTab[]) => {
    setNotes(Object.fromEntries(tabs.map((tab) => [tab.id, tab.notes ?? ""])));
    setWidths(Object.fromEntries(tabs.map((tab) => [tab.id, tab.notesWidth ?? defaultNotesWidth])));
  }, []);

  const prune = useCallback((ids: Set<string>) => {
    const keep = ([id]: [string, unknown]) => ids.has(id);
    setNotes((prev) => Object.fromEntries(Object.entries(prev).filter(keep)));
    setWidths((prev) => Object.fromEntries(Object.entries(prev).filter(keep)));
  }, []);

  const setNote = useCallback((tabId: string, text: string) => {
    setNotes((prev) => ({ ...prev, [tabId]: text }));
    void window.switcheroo.setTabNotes(tabId, text);
  }, []);

  const setWidth = useCallback((tabId: string, width: number) => {
    setWidths((prev) => ({ ...prev, [tabId]: width }));
    void window.switcheroo.setTabNotesWidth(tabId, width);
  }, []);

  return { notes, widths, hydrate, prune, setNote, setWidth };
}
