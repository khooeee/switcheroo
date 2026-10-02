import { useCompletionSound } from "./features/sound/useCompletionSound";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ActiveSessionId,
  AgentKind,
  SwitchboardTurn,
  PermissionRequest,
  Session,
  TranscriptTurn,
} from "../shared/types";
import { SWITCHBOARD_ID } from "../shared/types";
import { SessionRail } from "./features/sessions/SessionRail";
import { SwitchboardPanel } from "./features/switchboard/SwitchboardPanel";
import { ChatPanel } from "./features/chat/ChatPanel";
import { RightRail } from "./features/chat/RightRail";
import { useRightRail } from "./features/chat/useRightRail";
import { useSessionScrollPosition } from "./features/sessions/useSessionScrollPosition";
import { useAppShortcuts } from "./features/shortcuts/useAppShortcuts";
import { FindBar } from "./features/find/FindBar";
import { FindInHistoryModal } from "./features/find/FindInHistoryModal";
import { NewSessionModal } from "./features/sessions/NewSessionModal";
import { MAX_PINNED_SESSIONS } from "../shared/maxPinnedSessions";
import { useAgentQuestions } from "./features/permissions/useAgentQuestions";
import { PermissionBar } from "./features/permissions/PermissionBar";
import { flatRailSessions } from "./features/sessions/flatRailSessions";
import { seedComposerDraft } from "./features/chat/useComposerDraft";

export function App() {
  useCompletionSound();
  const [pinnedSessions, setPinnedSessions] = useState<Session[]>([]);
  const [unpinnedSessions, setUnpinnedSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<ActiveSessionId>(SWITCHBOARD_ID);
  const [switchboardTurns, setSwitchboardTurns] = useState<SwitchboardTurn[]>([]);
  const [transcripts, setTranscripts] = useState<Record<string, TranscriptTurn[]>>({});
  const [permission, setPermission] = useState<PermissionRequest | null>(null);
  const askQuestion = useAgentQuestions(activeSessionId);
  const [showNewSession, setShowNewSession] = useState(false);
  const [showFindInSessions, setShowFindInSessions] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [focusEvent, setFocusEvent] = useState<{
    id: string;
    turnId: string;
    key: number;
  } | null>(null);
  const [switchboardNotice, setSwitchboardNotice] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const switchboardRef = useRef<HTMLDivElement>(null);
  const rightRailScrollRef = useRef<HTMLDivElement>(null);
  const findRootRefs = useMemo(
    () => [activeSessionId === SWITCHBOARD_ID ? switchboardRef : chatRef, rightRailScrollRef],
    [activeSessionId],
  );
  const pinTranscriptToBottom = useSessionScrollPosition(
    activeSessionId,
    activeSessionId === SWITCHBOARD_ID ? switchboardRef : chatRef,
  );

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

  const {
    rightRailView,
    closeRightRail,
    clearRightRail,
    toggleSessionRightRail,
    forceSessionRightRail,
    toggleSwitchboardRightRail,
  } = useRightRail({
    activeSessionId,
    activeSession,
    transcripts,
    switchboardTurns,
    openSessions,
  });

  const selectSession = useCallback((id: ActiveSessionId) => {
    void window.switcheroo.setActiveSession(id);
    setFocusEvent(null);
    clearRightRail();
  }, [clearRightRail]);

  const promptFocus = useAppShortcuts({
    pinned: pinnedSessions,
    unpinned: unpinnedSessions,
    activeSessionId,
    activeSession,
    selectSession,
    showNewSession,
    showFindInSessions,
    findOpen,
    setFindOpen,
    setFindQuery,
    setShowNewSession,
    setShowFindInSessions,
  });

  const createSession = useCallback((
    agent: AgentKind,
    cwd: string,
    title: string,
    switcherooAware: boolean,
    pin: boolean,
  ) => {
    setShowNewSession(false);
    void window.switcheroo.createSession({ agent, cwd, title, switcherooAware, pin }).then((session) => {
      setTranscripts((prev) => ({ ...prev, [session.id]: prev[session.id] ?? [] }));
    });
    return Promise.resolve();
  }, []);

  const sendPrompt = useCallback(
    async (text: string) => {
      if (!activeSession) return;
      pinTranscriptToBottom();
      await window.switcheroo.sendPrompt(activeSession.id, text);
    },
    [activeSession, pinTranscriptToBottom],
  );

  const onSwitchboardClick = useCallback((sessionId: string, turnId: string, eventId: string) => {
    void window.switcheroo.navigateToEvent(sessionId, turnId, eventId);
  }, []);

  const onRightRailEventActivate = useCallback(
    (eventId: string) => {
      if (!rightRailView?.navigable) return;
      onSwitchboardClick(rightRailView.sessionId, rightRailView.turn.id, eventId);
    },
    [rightRailView, onSwitchboardClick],
  );

  return (
    <div className="app">
      <SessionRail
        pinned={pinnedSessions}
        unpinned={unpinnedSessions}
        activeSessionId={activeSessionId}
        onSelect={selectSession}
        onAdd={() => setShowNewSession(true)}
        onClose={(id) => void window.switcheroo.closeSession(id)}
        onStop={(id) => void window.switcheroo.cancelPrompt(id).catch(console.error)}
        onRename={(id, title) => void window.switcheroo.renameSession(id, title)}
        onFork={(id) => void window.switcheroo.forkSession(id).catch(console.error)}
        onPin={(id) => void window.switcheroo.pinSession(id)}
        onUnpin={(id) => void window.switcheroo.unpinSession(id)}
        onReorderPinned={(ids) => void window.switcheroo.reorderPinnedSessions(ids)}
      />

      <div className="main relative">
        {findOpen && (
          <FindBar
            key={activeSessionId}
            query={findQuery}
            onQuery={setFindQuery}
            rootRefs={findRootRefs}
            rootsKey={rightRailView ? 1 : 0}
            onClose={() => {
              setFindOpen(false);
              setFindQuery("");
            }}
          />
        )}

        {activeSessionId === SWITCHBOARD_ID ? (
          <SwitchboardPanel
            turns={switchboardTurns}
            sessions={openSessions}
            notice={switchboardNotice}
            scrollRef={switchboardRef}
            onNoticeDismiss={() => setSwitchboardNotice(null)}
            onTurnClick={onSwitchboardClick}
            onOpenRightRail={toggleSwitchboardRightRail}
          />
        ) : activeSession ? (
          <ChatPanel
            session={activeSession}
            turns={transcripts[activeSession.id] ?? []}
            focusEventId={focusEvent?.id ?? null}
            focusTurnId={focusEvent?.turnId ?? null}
            focusEventKey={focusEvent?.key ?? 0}
            promptFocus={promptFocus}
            chatRef={chatRef}
            onOpenRightRail={toggleSessionRightRail}
            onForceOpenRightRail={forceSessionRightRail}
            rightRailOpen={!!rightRailView}
            onSend={sendPrompt}
            onInterrupt={() => {
              void window.switcheroo.cancelPrompt(activeSession.id).catch(console.error);
            }}
            permission={permission?.sessionId === activeSession.id ? permission : null}
            askQuestion={askQuestion?.sessionId === activeSession.id ? askQuestion : null}
            onPermission={(optionId) => {
              if (!permission) return;
              void window.switcheroo.respondPermission(permission.requestId, optionId);
              setPermission(null);
            }}
            onAsk={(outcome) => {
              if (!askQuestion) return;
              void window.switcheroo.respondAskQuestion(askQuestion.requestId, outcome).catch(console.error);
            }}
          />
        ) : (
          <section className="panel">
            <div className="empty">Select or create a session to begin.</div>
          </section>
        )}
      </div>

      {rightRailView ? (
        <RightRail
          session={rightRailView.session}
          turn={rightRailView.turn}
          agent={rightRailView.agent}
          cwd={rightRailView.cwd}
          scrollRef={rightRailScrollRef}
          focusEventId={rightRailView.focusEventId}
          focusKey={rightRailView.focusKey}
          onClose={closeRightRail}
          onEventActivate={
            activeSessionId === SWITCHBOARD_ID && rightRailView.navigable
              ? onRightRailEventActivate
              : undefined
          }
        />
      ) : null}

      {permission && activeSessionId === SWITCHBOARD_ID && (
        <PermissionBar
          request={permission}
          onRespond={(optionId) => {
            void window.switcheroo.respondPermission(permission.requestId, optionId);
            setPermission(null);
          }}
        />
      )}

      {showNewSession && (
        <NewSessionModal
          canPin={pinnedSessions.length < MAX_PINNED_SESSIONS}
          onCancel={() => setShowNewSession(false)}
          onCreate={createSession}
        />
      )}

      <FindInHistoryModal
        open={showFindInSessions}
        onCancel={() => setShowFindInSessions(false)}
        onSelect={(hit) => {
          setShowFindInSessions(false);
          void window.switcheroo.navigateToEvent(hit.sessionId, hit.turnId, hit.eventId);
        }}
      />
    </div>
  );
}
