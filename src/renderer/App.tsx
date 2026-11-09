import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CreateSessionInput } from "../shared/createSessionInput";
import type { TranscriptTurn } from "../shared/transcript";
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
import { useVoiceConnection } from "./features/voice/useVoiceConnection";
import { VoiceLogPanel } from "./features/voiceLog/VoiceLogPanel";
import { voiceLogView } from "./features/voiceLog/voiceLogView";
import { voiceTurnDetails } from "./features/voiceLog/voiceTurnDetails";
import { VoiceTurnRail } from "./features/voiceLog/VoiceTurnRail";
import { SubagentOpenContext } from "./features/subagents/SubagentOpenContext";
import { useSubagentTranscripts } from "./features/subagents/useSubagentTranscripts";

/** Stable fallback so memoized SessionTranscript does not re-render on a new `[]`. */
const NO_TURNS: TranscriptTurn[] = [];

export function App() {
  useCompletionSound();
  useVoiceConnection();
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
  const voiceLogOpen = useSyncExternalStore(voiceLogView.subscribe, voiceLogView.getSnapshot);
  const voiceTurnId = useSyncExternalStore(voiceTurnDetails.subscribe, voiceTurnDetails.getSnapshot);
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
  const voiceLogRef = useRef<HTMLDivElement>(null);
  const voiceRailRef = useRef<HTMLDivElement>(null);
  const voiceRailOpen = voiceLogOpen && !!voiceTurnId;
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
    if (voiceLogOpen) return [voiceRailOpen ? voiceRailRef : voiceLogRef];
    if (rightRailView) return [rightRailScrollRef];
    return [chatRef];
  }, [findScope, rightRailView, voiceLogOpen, voiceRailOpen]);
  const railOpen = voiceLogOpen ? voiceRailOpen : !!rightRailView;
  const findScopeName = findScope ? "message" : railOpen ? "turn-details" : voiceLogOpen ? "voice-log" : "session";

  useTurnDetailsEvent(toggleRightRail);

  // Each tab keeps its right rail open (or closed) across tab switches.
  const selectTab = useCallback((id: string) => {
    voiceLogView.close();
    void window.switcheroo.setActiveTab(id);
    setFocusEvent(null);
  }, [setFocusEvent]);

  // Switching sessions any other way (shortcuts, new session, navigation) also leaves the Voice Log.
  useEffect(() => {
    voiceLogView.close();
  }, [activeTabId]);

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

  const createSession = useCallback((input: CreateSessionInput) => {
    setShowNewSession(false);
    void window.switcheroo.createSession(input).then((session) => {
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

          {findOpen && (activeSession || voiceLogOpen) && (
            <FindBar
              key={`${voiceLogOpen ? "voice-log" : activeTabId}:${findScope?.getAttribute("data-event-id") ?? findScopeName}`}
              query={findQuery}
              onQuery={setFindQuery}
              rootRefs={findRootRefs}
              rootsKey={`${railOpen ? 1 : 0}:${findScope?.getAttribute("data-event-id") ?? ""}`}
              scope={findScopeName}
              onClose={closeFind}
            />
          )}

          {voiceLogOpen ? (
            <VoiceLogPanel scrollRef={voiceLogRef} />
          ) : activeSession ? (
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

        {rightRailView && !voiceLogOpen ? (
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
        {voiceRailOpen && voiceTurnId ? <VoiceTurnRail turnId={voiceTurnId} scrollRef={voiceRailRef} /> : null}

        {showNewSession && (
          <NewSessionModal
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
