import { useEffect, useMemo, useState } from "react";
import type { ActiveTabId } from "../../../shared/activeTabId";
import type { Session } from "../../../shared/session";
import type { TranscriptTurn } from "../../../shared/transcript";
import { seedComposerDraft } from "../chat/seedComposerDraft";
import { flatRailSessions } from "./flatRailSessions";
import { shareById } from "./shareById";
import { shareTurn } from "./shareTurn";
import { upsertTurn } from "./upsertTurn";

/** IPC-backed session list and transcripts. */
export function useAppSessionState() {
  const [pinnedSessions, setPinnedSessions] = useState<Session[]>([]);
  const [unpinnedSessions, setUnpinnedSessions] = useState<Session[]>([]);
  const [activeTabId, setActiveTabId] = useState<ActiveTabId>(null);
  const [transcripts, setTranscripts] = useState<Record<string, TranscriptTurn[]>>({});
  const [focusEvent, setFocusEvent] = useState<{
    id: string;
    turnId: string;
    sessionId: string;
    key: number;
  } | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  useEffect(() => {
    void window.switcheroo.listSessions().then(async (data) => {
      setPinnedSessions(data.pinned);
      setUnpinnedSessions(data.unpinned);
      setActiveTabId(data.activeTabId);
      setTranscripts({});
      const sessionId = data.activeTabId;
      if (sessionId) {
        const turns = await window.switcheroo.getTranscript(sessionId);
        setTranscripts({ [sessionId]: turns });
      }
    });

    const unsubs = [
      window.switcheroo.onSessionsChanged(({ pinned: p, unpinned: u, activeTabId: a }) => {
        setPinnedSessions((prev) => shareById(prev, p));
        setUnpinnedSessions((prev) => shareById(prev, u));
        setActiveTabId(a);
        // A focus belongs to one session. Clear it on leaving so a later visit does not force
        // that session's right rail (which each tab keeps) back onto the old event.
        setFocusEvent((prev) => (prev && prev.sessionId !== a ? null : prev));
      }),
      window.switcheroo.onSessionRemoved(({ message }) => setSessionNotice(message)),
      window.switcheroo.onTranscript(({ sessionId, turn }) => {
        setTranscripts((prev) => {
          const list = prev[sessionId] ?? [];
          const next = upsertTurn(list, turn);
          return next === list ? prev : { ...prev, [sessionId]: next };
        });
      }),
      window.switcheroo.onTranscriptReset(({ sessionId, turns, draft }) => {
        if (draft) seedComposerDraft(sessionId, draft);
        setTranscripts((prev) => ({ ...prev, [sessionId]: turns }));
      }),
      window.switcheroo.onNavigateToEvent(({ sessionId, turnId, eventId }) => {
        setFocusEvent((prev) => ({
          id: eventId,
          turnId,
          sessionId,
          key: (prev?.key ?? 0) + 1,
        }));
      }),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  const openSessions = useMemo(
    () => flatRailSessions(pinnedSessions, unpinnedSessions),
    [pinnedSessions, unpinnedSessions],
  );

  const activeSession = useMemo(
    () => openSessions.find((t) => t.id === activeTabId) ?? null,
    [openSessions, activeTabId],
  );

  useEffect(() => {
    const sessionId = activeSession?.id;
    if (!sessionId) return;
    let cancelled = false;
    void window.switcheroo.getTranscript(sessionId).then((turns) => {
      if (cancelled) return;
      setTranscripts((prev) => {
        const list = prev[sessionId];
        const next = list ? shareById(list, turns, shareTurn) : turns;
        return next === list ? prev : { ...prev, [sessionId]: next };
      });
    });
    return () => {
      cancelled = true;
    };
  }, [activeSession?.id]);

  return {
    pinnedSessions,
    unpinnedSessions,
    activeTabId,
    activeSession,
    transcripts,
    setTranscripts,
    focusEvent,
    setFocusEvent,
    sessionNotice,
    setSessionNotice,
  };
}
