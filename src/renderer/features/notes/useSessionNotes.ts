import { useCallback, useState } from "react";
import type { Session } from "../../../shared/types";
import { defaultNotesWidth } from "./clampNotesWidth";

export function useSessionNotes() {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [widths, setWidths] = useState<Record<string, number>>({});

  const hydrate = useCallback((sessions: Session[]) => {
    setNotes(Object.fromEntries(sessions.map((session) => [session.id, session.notes ?? ""])));
    setWidths(Object.fromEntries(sessions.map((session) => [session.id, session.notesWidth ?? defaultNotesWidth])));
  }, []);

  const syncFromSessions = useCallback((sessions: Session[]) => {
    setNotes((prev) => {
      const next = { ...prev };
      for (const tab of sessions) {
        if (tab.notes !== undefined) next[tab.id] = tab.notes;
      }
      return next;
    });
    setWidths((prev) => {
      const next = { ...prev };
      for (const tab of sessions) {
        if (tab.notesWidth !== undefined) next[tab.id] = tab.notesWidth;
      }
      return next;
    });
  }, []);

  const prune = useCallback((ids: Set<string>) => {
    const keep = ([id]: [string, unknown]) => ids.has(id);
    setNotes((prev) => Object.fromEntries(Object.entries(prev).filter(keep)));
    setWidths((prev) => Object.fromEntries(Object.entries(prev).filter(keep)));
  }, []);

  const setNote = useCallback((sessionId: string, text: string) => {
    setNotes((prev) => ({ ...prev, [sessionId]: text }));
    void window.switcheroo.setSessionNotes(sessionId, text);
  }, []);

  const setWidth = useCallback((sessionId: string, width: number) => {
    setWidths((prev) => ({ ...prev, [sessionId]: width }));
    void window.switcheroo.setSessionNotesWidth(sessionId, width);
  }, []);

  return { notes, widths, hydrate, syncFromSessions, prune, setNote, setWidth };
}
