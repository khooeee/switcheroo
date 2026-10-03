import { useEffect, useMemo, useState } from "react";
import type {
  ActiveSessionId,
  PermissionRequest,
  Session,
  SwitchboardTurn,
  TranscriptTurn,
} from "../../../shared/types";
import { SWITCHBOARD_ID } from "../../../shared/types";
import { seedComposerDraft } from "../chat/useComposerDraft";
import { flatRailSessions } from "./flatRailSessions";

/** IPC-backed session list, transcripts, switchboard, and permission state. */
export function useAppSessionState() {
  const [pinnedSessions, setPinnedSessions] = useState<Session[]>([]);
  const [unpinnedSessions, setUnpinnedSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<ActiveSessionId>(SWITCHBOARD_ID);
  const [switchboardTurns, setSwitchboardTurns] = useState<SwitchboardTurn[]>([]);
  const [transcripts, setTranscripts] = useState<Record<string, TranscriptTurn[]>>({});
  const [permission, setPermission] = useState<PermissionRequest | null>(null);
  const [focusEvent, setFocusEvent] = useState<{
    id: string;
    turnId: string;
    key: number;
  } | null>(null);
  const [switchboardNotice, setSwitchboardNotice] = useState<string | null>(null);

  useEffect(() => {
    void window.switcheroo.listSessions().then(async (data) => {
      setPinnedSessions(data.pinned);
      setUnpinnedSessions(data.unpinned);
      setActiveSessionId(data.activeSessionId);
      setSwitchboardTurns(data.switchboardTurns);
      setTranscripts({});
      if (data.activeSessionId !== SWITCHBOARD_ID) {
        const turns = await window.switcheroo.getTranscript(data.activeSessionId);
        setTranscripts({ [data.activeSessionId]: turns });
      }
    });

    const unsubs = [
      window.switcheroo.onSessionsChanged(({ pinned: p, unpinned: u, activeSessionId: a }) => {
        setPinnedSessions(p);
        setUnpinnedSessions(u);
        setActiveSessionId(a);
      }),
      window.switcheroo.onSwitchboardTurn((turn) => {
        setSwitchboardTurns((prev) => {
          const idx = prev.findIndex((entry) => entry.id === turn.id);
          if (idx >= 0) {
            const next = prev.slice();
            next[idx] = turn;
            return next;
          }
          return [...prev, turn].slice(-2000);
        });
      }),
      window.switcheroo.onSwitchboardTurns((turns) => setSwitchboardTurns(turns)),
      window.switcheroo.onSwitchboardSessionRemoved(({ sessionId, message }) => {
        setSwitchboardTurns((prev) => prev.filter((turn) => turn.sessionId !== sessionId));
        setSwitchboardNotice(message);
        setActiveSessionId(SWITCHBOARD_ID);
      }),
      window.switcheroo.onTranscript(({ sessionId, turn }) => {
        setTranscripts((prev) => {
          const list = [...(prev[sessionId] ?? [])];
          const idx = list.findIndex((entry) => entry.id === turn.id);
          if (idx >= 0) list[idx] = turn;
          else list.push(turn);
          return { ...prev, [sessionId]: list };
        });
      }),
      window.switcheroo.onTranscriptReset(({ sessionId, turns, draft }) => {
        if (draft) seedComposerDraft(sessionId, draft);
        setTranscripts((prev) => ({ ...prev, [sessionId]: turns }));
      }),
      window.switcheroo.onPermission((req) => setPermission(req)),
      window.switcheroo.onNavigateToEvent(({ turnId, eventId }) => {
        setFocusEvent((prev) => ({
          id: eventId,
          turnId,
          key: (prev?.key ?? 0) + 1,
        }));
      }),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  useEffect(() => {
    if (activeSessionId === SWITCHBOARD_ID) return;
    let cancelled = false;
    void window.switcheroo.getTranscript(activeSessionId).then((turns) => {
      if (cancelled) return;
      setTranscripts((prev) => ({ ...prev, [activeSessionId]: turns }));
    });
    return () => {
      cancelled = true;
    };
  }, [activeSessionId]);

  const openSessions = useMemo(
    () => flatRailSessions(pinnedSessions, unpinnedSessions),
    [pinnedSessions, unpinnedSessions],
  );
  const activeSession = useMemo(
    () => openSessions.find((t) => t.id === activeSessionId) ?? null,
    [openSessions, activeSessionId],
  );

  return {
    pinnedSessions,
    unpinnedSessions,
    activeSessionId,
    activeSession,
    openSessions,
    switchboardTurns,
    transcripts,
    setTranscripts,
    permission,
    setPermission,
    focusEvent,
    setFocusEvent,
    switchboardNotice,
    setSwitchboardNotice,
  };
}
