import { useEffect, useMemo, useState } from "react";
import type { ActiveTabId } from "../../../shared/activeTabId";
import type { PermissionRequest } from "../../../shared/agentRequests";
import type { Session, SessionTab } from "../../../shared/session";
import type { SwitchboardTurn } from "../../../shared/switchboardTurn";
import type { TranscriptTurn } from "../../../shared/transcript";
import { SWITCHBOARD_ID } from "../../../shared/switchboardId";
import { findChildTab } from "../../../shared/tabNav/findChildTab";
import { sessionIdForTab } from "../../../shared/tabNav/sessionIdForTab";
import { seedComposerDraft } from "../chat/seedComposerDraft";
import { flatRailSessions } from "./flatRailSessions";
import { shareById } from "./shareById";
import { shareTurn } from "./shareTurn";
import { upsertTurn } from "./upsertTurn";

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
        setPinnedSessions((prev) => shareById(prev, p));
        setUnpinnedSessions((prev) => shareById(prev, u));
        setActiveTabId(a);
      }),
      window.switcheroo.onSwitchboardTurn((turn) => {
        setSwitchboardTurns((prev) => {
          const next = upsertTurn(prev, turn);
          return next.length > prev.length ? next.slice(-2000) : next;
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
          const list = prev[sessionId] ?? [];
          const next = upsertTurn(list, turn);
          return next === list ? prev : { ...prev, [sessionId]: next };
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
      setTranscripts((prev) => {
        const list = prev[parentId];
        const next = list ? shareById(list, turns, shareTurn) : turns;
        return next === list ? prev : { ...prev, [parentId]: next };
      });
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
