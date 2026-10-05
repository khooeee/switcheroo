import { useEffect, useMemo, useState } from "react";
import type {
  ActiveTabId,
  PermissionRequest,
  Session,
  SessionTab,
  SwitchboardTurn,
  TranscriptTurn,
} from "../../../shared/types";
import { SWITCHBOARD_ID } from "../../../shared/types";
import { findChildTab, sessionIdForTab } from "../../../shared/tabNav";
import { seedComposerDraft } from "../chat/useComposerDraft";
import { flatRailSessions } from "./flatRailSessions";

/** IPC-backed session list, transcripts, switchboard, and permission state. */
export function useAppSessionState() {
  const [pinnedSessions, setPinnedSessions] = useState<Session[]>([]);
  const [unpinnedSessions, setUnpinnedSessions] = useState<Session[]>([]);
  const [activeTabId, setActiveTabId] = useState<ActiveTabId>(SWITCHBOARD_ID);
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
      setActiveTabId(data.activeTabId);
      setSwitchboardTurns(data.switchboardTurns);
      setTranscripts({});
      const parentId = sessionIdForTab(data.activeTabId, [...data.pinned, ...data.unpinned]);
      if (parentId) {
        const turns = await window.switcheroo.getTranscript(parentId);
        setTranscripts({ [parentId]: turns });
      }
    });

    const unsubs = [
      window.switcheroo.onSessionsChanged(({ pinned: p, unpinned: u, activeTabId: a }) => {
        setPinnedSessions(p);
        setUnpinnedSessions(u);
        setActiveTabId(a);
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
        setActiveTabId(SWITCHBOARD_ID);
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

  const openSessions = useMemo(
    () => flatRailSessions(pinnedSessions, unpinnedSessions),
    [pinnedSessions, unpinnedSessions],
  );

  const activeChild = useMemo(
    () => findChildTab(openSessions, activeTabId),
    [openSessions, activeTabId],
  );

  const activeSession = useMemo(() => {
    if (activeChild) return activeChild.session;
    return openSessions.find((t) => t.id === activeTabId) ?? null;
  }, [openSessions, activeTabId, activeChild]);

  const activeTerminalTab: SessionTab | null = activeChild?.tab.kind === "terminal"
    ? activeChild.tab
    : null;

  useEffect(() => {
    const parentId = activeSession?.id;
    if (!parentId || activeTerminalTab) return;
    let cancelled = false;
    void window.switcheroo.getTranscript(parentId).then((turns) => {
      if (cancelled) return;
      setTranscripts((prev) => ({ ...prev, [parentId]: turns }));
    });
    return () => {
      cancelled = true;
    };
  }, [activeSession?.id, activeTerminalTab]);

  return {
    pinnedSessions,
    unpinnedSessions,
    activeTabId,
    activeSession,
    activeTerminalTab,
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
