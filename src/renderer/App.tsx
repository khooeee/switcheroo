import { useCallback, useMemo, useRef, useState } from "react";
import type { AgentKind } from "../shared/agentKind";
import type { TranscriptTurn } from "../shared/transcript";
import { MAX_PINNED_SESSIONS } from "../shared/maxPinnedSessions";
import { SessionRail } from "./features/sessions/SessionRail";
import { SessionNotice } from "./features/sessions/SessionNotice";
import { useAppSessionState } from "./features/sessions/useAppSessionState";
import { ChatPanel } from "./features/chat/ChatPanel";
import { RightRail } from "./features/chat/RightRail";
import { useRightRail } from "./features/chat/useRightRail";
import { useTurnDetailsEvent } from "./features/chat/useTurnDetailsEvent";
import { useChatActions } from "./features/chat/useChatActions";
import { useSessionScrollPosition } from "./features/sessions/useSessionScrollPosition";
import { useAppShortcuts } from "./features/shortcuts/useAppShortcuts";
import { FindBar } from "./features/find/FindBar";
import { FindInHistoryModal } from "./features/find/FindInHistoryModal";
import { useFindUiState } from "./features/find/useFindUiState";
import { NewSessionModal } from "./features/sessions/NewSessionModal";
import { useSessionRailActions } from "./features/sessions/useSessionRailActions";
import { useAgentQuestions } from "./features/permissions/useAgentQuestions";
import { useCompletionSound } from "./features/sound/useCompletionSound";
import { SubagentOpenContext } from "./features/subagents/SubagentOpenContext";
import { useSubagentTranscripts } from "./features/subagents/useSubagentTranscripts";

/** Stable fallback so memoized SessionTranscript does not re-render on a new `[]`. */
const NO_TURNS: TranscriptTurn[] = [];

export function App() {
  useCompletionSound();
  const {
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
  } = useAppSessionState();
  const railActions = useSessionRailActions();
  const { subagentTranscripts, loadingSubagents, loadSubagentTranscript } = useSubagentTranscripts();

  const [showNewSession, setShowNewSession] = useState(false);
  const [sessionFilter, setSessionFilter] = useState("");
  const {
    showFindInSessions,
    setShowFindInSessions,
    findOpen,
    findQuery,
    setFindQuery,
    findScope,
    findScopeRef,
    closeFind,
    setFindVisible,
  } = useFindUiState(activeTabId);
  const chatRef = useRef<HTMLDivElement>(null);
  const rightRailScrollRef = useRef<HTMLDivElement>(null);
  const askQuestion = useAgentQuestions(activeTabId);
  const pinTranscriptToBottom = useSessionScrollPosition(activeTabId, chatRef);

  const {
    rightRailView,
    closeRightRail,
    toggleRightRail,
    forceRightRail,
    toggleSubagentRightRail,
  } = useRightRail({
    activeSession,
    transcripts,
    subagentTranscripts,
    loadingSubagents,
  });

  const openSubagent = useCallback((sessionId: string, subagentId: string) => {
    loadSubagentTranscript(sessionId, subagentId);
    toggleSubagentRightRail(subagentId);
  }, [loadSubagentTranscript, toggleSubagentRightRail]);

  const findRootRefs = useMemo(() => {
    if (findScope) return [findScopeRef];
    if (rightRailView) return [rightRailScrollRef];
    return [chatRef];
  }, [findScope, rightRailView]);

  useTurnDetailsEvent(toggleRightRail);

  // Each tab keeps its right rail open (or closed) across tab switches.
  const selectTab = useCallback((id: string) => {
    void window.switcheroo.setActiveTab(id);
    setFocusEvent(null);
  }, [setFocusEvent]);

  const promptFocus = useAppShortcuts({
    pinned: pinnedSessions,
    unpinned: unpinnedSessions,
    activeTabId,
    activeSession,
    selectTab,
    showNewSession,
    showFindInSessions,
    findOpen,
    rightRailOpen: !!rightRailView,
    sessionFilter,
    setFindOpen: setFindVisible,
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

  const chat = useChatActions(activeTabId, askQuestion, pinTranscriptToBottom);

  return (
    <SubagentOpenContext.Provider value={openSubagent}>
      <div className="app">
        <SessionRail
          pinned={pinnedSessions}
          unpinned={unpinnedSessions}
          activeTabId={activeTabId}
          filter={sessionFilter}
          onFilter={setSessionFilter}
          onSelect={selectTab}
          onAdd={() => setShowNewSession(true)}
          {...railActions}
        />

        <div className="main relative">
          {sessionNotice && (
            <SessionNotice message={sessionNotice} onDismiss={() => setSessionNotice(null)} />
          )}

          {findOpen && activeSession && (
            <FindBar
              key={`${activeTabId}:${findScope?.getAttribute("data-event-id") ?? (rightRailView ? "turn" : "session")}`}
              query={findQuery}
              onQuery={setFindQuery}
              rootRefs={findRootRefs}
              rootsKey={`${rightRailView ? 1 : 0}:${findScope?.getAttribute("data-event-id") ?? ""}`}
              scope={findScope ? "message" : rightRailView ? "turn-details" : "session"}
              onClose={closeFind}
            />
          )}

          {activeSession ? (
            <ChatPanel
              session={activeSession}
              turns={transcripts[activeSession.id] ?? NO_TURNS}
              focusEventId={focusEvent?.id ?? null}
              focusTurnId={focusEvent?.turnId ?? null}
              focusEventKey={focusEvent?.key ?? 0}
              promptFocus={promptFocus}
              chatRef={chatRef}
              onOpenRightRail={toggleRightRail}
              onForceOpenRightRail={forceRightRail}
              openSubagentId={rightRailView?.subagent?.id ?? null}
              onSend={chat.send}
              onInterrupt={chat.interrupt}
              askQuestion={askQuestion}
              onAsk={chat.answer}
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
            subagent={rightRailView.subagent}
            scrollRef={rightRailScrollRef}
            focusEventId={rightRailView.focusEventId}
            focusKey={rightRailView.focusKey}
            onClose={closeRightRail}
          />
        ) : null}

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
    </SubagentOpenContext.Provider>
  );
}
