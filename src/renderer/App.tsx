import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AgentKind } from "../shared/types";
import { SWITCHBOARD_ID } from "../shared/types";
import { MAX_PINNED_SESSIONS } from "../shared/maxPinnedSessions";
import { SessionRail } from "./features/sessions/SessionRail";
import { useAppSessionState } from "./features/sessions/useAppSessionState";
import { SwitchboardPanel } from "./features/switchboard/SwitchboardPanel";
import { ChatPanel } from "./features/chat/ChatPanel";
import { RightRail } from "./features/chat/RightRail";
import { useRightRail } from "./features/chat/useRightRail";
import { useSessionScrollPosition } from "./features/sessions/useSessionScrollPosition";
import { useAppShortcuts } from "./features/shortcuts/useAppShortcuts";
import { FindBar } from "./features/find/FindBar";
import { FindInHistoryModal } from "./features/find/FindInHistoryModal";
import {
  clearPendingFindScope,
  takePendingFindScope,
} from "./features/find/pendingFindScope";
import { NewSessionModal } from "./features/sessions/NewSessionModal";
import { useAgentQuestions } from "./features/permissions/useAgentQuestions";
import { PermissionBar } from "./features/permissions/PermissionBar";
import { useCompletionSound } from "./features/sound/useCompletionSound";

export function App() {
  useCompletionSound();
  const {
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
  } = useAppSessionState();

  const [showNewSession, setShowNewSession] = useState(false);
  const [showFindInSessions, setShowFindInSessions] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findScope, setFindScope] = useState<HTMLElement | null>(null);
  const [sessionFilter, setSessionFilter] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);
  const switchboardRef = useRef<HTMLDivElement>(null);
  const rightRailScrollRef = useRef<HTMLDivElement>(null);
  const findScopeRef = useRef<HTMLElement | null>(null);
  findScopeRef.current = findScope;
  const askQuestion = useAgentQuestions(activeSessionId);
  const pinTranscriptToBottom = useSessionScrollPosition(
    activeSessionId,
    activeSessionId === SWITCHBOARD_ID ? switchboardRef : chatRef,
  );

  const closeFind = useCallback(() => {
    setFindOpen(false);
    setFindQuery("");
    setFindScope(null);
    clearPendingFindScope();
  }, []);

  const openFind = useCallback(() => {
    clearPendingFindScope();
    setFindScope(null);
    setFindOpen(true);
  }, []);

  useEffect(() => {
    const onScoped = () => {
      const el = takePendingFindScope();
      if (!el) return;
      setFindScope(el);
      setFindOpen(true);
    };
    window.addEventListener("switcheroo:find-scoped", onScoped);
    return () => window.removeEventListener("switcheroo:find-scoped", onScoped);
  }, []);

  useEffect(() => {
    setFindScope(null);
    clearPendingFindScope();
  }, [activeSessionId]);

  useEffect(() => {
    if (!findScope) return;
    findScope.classList.add("find-scope");
    return () => findScope.classList.remove("find-scope");
  }, [findScope]);

  const {
    rightRailView,
    closeRightRail,
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

  const findRootRefs = useMemo(() => {
    if (findScope) return [findScopeRef];
    if (rightRailView) return [rightRailScrollRef];
    return [activeSessionId === SWITCHBOARD_ID ? switchboardRef : chatRef];
  }, [activeSessionId, findScope, rightRailView]);

  useEffect(() => {
    const onTurnDetails = (event: Event) => {
      const detail = (event as CustomEvent<{ turnId: string; eventId: string }>).detail;
      if (!detail?.turnId || !detail.eventId) return;
      if (activeSessionId === SWITCHBOARD_ID) {
        toggleSwitchboardRightRail(detail.turnId, detail.eventId);
      } else {
        toggleSessionRightRail(detail.turnId, detail.eventId);
      }
    };
    window.addEventListener("switcheroo:turn-details", onTurnDetails);
    return () => window.removeEventListener("switcheroo:turn-details", onTurnDetails);
  }, [activeSessionId, toggleSessionRightRail, toggleSwitchboardRightRail]);

  const selectSession = useCallback((id: typeof activeSessionId) => {
    void window.switcheroo.setActiveSession(id);
    setFocusEvent(null);
    closeRightRail();
  }, [closeRightRail, setFocusEvent]);

  const promptFocus = useAppShortcuts({
    pinned: pinnedSessions,
    unpinned: unpinnedSessions,
    activeSessionId,
    activeSession,
    selectSession,
    showNewSession,
    showFindInSessions,
    findOpen,
    rightRailOpen: !!rightRailView,
    sessionFilter,
    setFindOpen: (open) => {
      if (open) openFind();
      else closeFind();
    },
    setFindQuery,
    setShowNewSession,
    setShowFindInSessions,
    onCloseRightRail: closeRightRail,
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
  }, [setTranscripts]);

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

  return (
    <div className="app">
      <SessionRail
        pinned={pinnedSessions}
        unpinned={unpinnedSessions}
        activeSessionId={activeSessionId}
        filter={sessionFilter}
        onFilter={setSessionFilter}
        onSelect={selectSession}
        onAdd={() => setShowNewSession(true)}
        onClose={(id) => void window.switcheroo.closeSession(id)}
        onStop={(id) => void window.switcheroo.cancelPrompt(id).catch(console.error)}
        onRename={(id, title) => void window.switcheroo.renameSession(id, title)}
        onFork={(id) => void window.switcheroo.forkSession(id).catch(console.error)}
        onPin={(id) => void window.switcheroo.pinSession(id)}
        onUnpin={(id) => void window.switcheroo.unpinSession(id)}
      />

      <div className="main relative">
        {findOpen && (
          <FindBar
            key={`${activeSessionId}:${findScope?.getAttribute("data-event-id") ?? (rightRailView ? "turn" : "session")}`}
            query={findQuery}
            onQuery={setFindQuery}
            rootRefs={findRootRefs}
            rootsKey={`${rightRailView ? 1 : 0}:${findScope?.getAttribute("data-event-id") ?? ""}`}
            scope={findScope ? "message" : rightRailView ? "turn-details" : "session"}
            onClose={closeFind}
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
