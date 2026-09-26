import { useCompletionSound } from "./features/sound/useCompletionSound";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ActiveSessionId,
  AgentKind,
  MasterEvent,
  PermissionRequest,
  Session,
  TranscriptItem,
} from "../shared/types";
import { SWITCHBOARD_ID } from "../shared/types";
import { SessionRail } from "./features/sessions/SessionRail";
import { MasterFeed } from "./features/master/MasterFeed";
import { ChatPanel } from "./features/chat/ChatPanel";
import { useSessionScrollPosition } from "./features/sessions/useSessionScrollPosition";
import { useSessionShortcuts } from "./features/sessions/useSessionShortcuts";
import { useSessionFocusShortcuts } from "./features/shortcuts/useSessionFocusShortcuts";
import { ThinkingIndicator } from "./features/chat/ThinkingIndicator";
import { FindBar } from "./features/find/FindBar";
import { NewSessionModal } from "./features/sessions/NewSessionModal";
import { useAgentQuestions } from "./features/permissions/useAgentQuestions";
import { PermissionBar } from "./features/permissions/PermissionBar";
import { SessionNotes } from "./features/notes/SessionNotes";
import { defaultNotesWidth } from "./features/notes/clampNotesWidth";
import { useSessionNotes } from "./features/notes/useSessionNotes";

export function App() {
  useCompletionSound();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<ActiveSessionId>(SWITCHBOARD_ID);
  const [masterEvents, setMasterEvents] = useState<MasterEvent[]>([]);
  const [transcripts, setTranscripts] = useState<Record<string, TranscriptItem[]>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [permission, setPermission] = useState<PermissionRequest | null>(null);
  const askQuestion = useAgentQuestions(activeSessionId);
  const [showNewSession, setShowNewTab] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [focusEventId, setFocusEventId] = useState<string | null>(null);
  const sessionNotes = useSessionNotes();
  const chatRef = useRef<HTMLDivElement>(null);
  const masterRef = useRef<HTMLDivElement>(null);
  const notesScrollRef = useRef<HTMLTextAreaElement>(null);
  useSessionScrollPosition(activeSessionId, activeSessionId === SWITCHBOARD_ID ? masterRef : chatRef);
  useSessionScrollPosition(activeSessionId === SWITCHBOARD_ID ? "" : activeSessionId, notesScrollRef, false);

  useEffect(() => {
    void window.switcheroo.listSessions().then(async (data) => {
      setSessions(data.sessions);
      setActiveSessionId(data.activeSessionId);
      setMasterEvents(data.masterEvents);
      sessionNotes.hydrate(data.sessions);
      setTranscripts({});
      if (data.activeSessionId !== SWITCHBOARD_ID) {
        const items = await window.switcheroo.getTranscript(data.activeSessionId);
        setTranscripts({ [data.activeSessionId]: items });
      }
    });

    const unsubs = [
      window.switcheroo.onSessionsChanged(({ sessions: t, activeSessionId: a }) => {
        const ids = new Set(t.map((tab) => tab.id));
        sessionNotes.prune(ids);
        sessionNotes.syncFromSessions(t);
        setSessions(t);
        setActiveSessionId(a);
      }),
      window.switcheroo.onMasterEvent((event) => {
        setMasterEvents((prev) => {
          const idx = prev.findIndex((entry) => entry.id === event.id);
          if (idx >= 0) {
            const next = prev.slice();
            next[idx] = event;
            return next;
          }
          return [...prev, event].slice(-2000);
        });
      }),
      window.switcheroo.onTranscript(({ sessionId, item, replaceId }) => {
        setTranscripts((prev) => {
          const list = [...(prev[sessionId] ?? [])];
          if (replaceId) {
            const idx = list.findIndex((i) => i.id === replaceId);
            if (idx >= 0) {
              list[idx] = item;
              return { ...prev, [sessionId]: list };
            }
          }
          const existing = list.findIndex((i) => i.id === item.id);
          if (existing >= 0) list[existing] = item;
          else list.push(item);
          return { ...prev, [sessionId]: list };
        });
      }),
      window.switcheroo.onTranscriptReset(({ sessionId, items }) => {
        setTranscripts((prev) => ({ ...prev, [sessionId]: items }));
      }),
      window.switcheroo.onPermission((req) => setPermission(req)),
      window.switcheroo.onNavigateToEvent(({ eventId }) => {
        setFocusEventId(eventId);
      }),
    ];

    const onFind = () => { if (!document.querySelector("dialog[open]")) setFindOpen(true); };
    const onNewSession = () => { if (!document.querySelector("dialog[open]")) setShowNewTab(true); };
    window.addEventListener("switcheroo:find", onFind);
    window.addEventListener("switcheroo:new-session", onNewSession);
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if ((e.metaKey || e.ctrlKey) && !(e.metaKey && e.ctrlKey) && !e.shiftKey && !e.altKey
        && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setFindOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setShowNewTab(true);
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      unsubs.forEach((u) => u());
      window.removeEventListener("switcheroo:find", onFind);
      window.removeEventListener("switcheroo:new-session", onNewSession);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const activeSession = useMemo(
    () => sessions.find((t) => t.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );

  const selectSession = useCallback((id: ActiveSessionId) => {
    void window.switcheroo.setActiveSession(id);
    setFocusEventId(null);
  }, []);

  const promptFocus = useSessionFocusShortcuts(activeSessionId, showNewSession);
  useSessionShortcuts(sessions, activeSessionId, selectSession, showNewSession);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if (e.key === "Escape") {
        if (e.defaultPrevented || e.repeat || e.isComposing || showNewSession) return;
        if (document.querySelector('[role="menu"]')) return;
        if (findOpen) {
          setFindOpen(false);
          setFindQuery("");
          return;
        }
        if (activeSession?.status !== "running") return;
        e.preventDefault();
        void window.switcheroo.cancelPrompt(activeSession.id).catch(console.error);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeSession, showNewSession, findOpen]);

  const createSession = useCallback((
    agentKind: AgentKind,
    cwd: string,
    title: string,
    switcherooAware: boolean,
  ) => {
    setShowNewTab(false);
    void window.switcheroo.createSession({ agentKind, cwd, title, switcherooAware }).then((tab) => {
      setTranscripts((prev) => ({ ...prev, [tab.id]: prev[tab.id] ?? [] }));
    });
    return Promise.resolve();
  }, []);

  const sendPrompt = useCallback(
    async (text: string) => {
      if (!activeSession) return;
      await window.switcheroo.sendPrompt(activeSession.id, text);
    },
    [activeSession],
  );

  const onMasterClick = useCallback((event: MasterEvent) => {
    if (!event.navigable) return;
    void window.switcheroo.navigateToEvent(event.sessionId, event.id);
  }, []);

  return (
    <div className="app">
      <SessionRail
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelect={selectSession}
        onAdd={() => setShowNewTab(true)}
        onClose={(id) => void window.switcheroo.closeSession(id)}
        onRename={(id, title) => void window.switcheroo.renameSession(id, title)}
        onFork={(id) => void window.switcheroo.forkSession(id)}
        onReorder={(ids) => void window.switcheroo.reorderSessions(ids)}
      />

      <div className="main relative">
        {findOpen && (
          <FindBar
            key={activeSessionId}
            query={findQuery}
            onQuery={setFindQuery}
            rootRef={activeSessionId === SWITCHBOARD_ID ? masterRef : chatRef}
            onClose={() => {
              setFindOpen(false);
              setFindQuery("");
            }}
          />
        )}

        {activeSessionId === SWITCHBOARD_ID ? (
          <section className="panel">
            <div className="panel-header">
              <h2>Switchboard</h2>
            </div>
            <div className="scroll" ref={masterRef}>
              <MasterFeed
                events={masterEvents}
                sessions={sessions}
                onClick={onMasterClick}
              />
              {sessions.some((tab) => tab.status === "running") && <ThinkingIndicator />}
            </div>
          </section>
        ) : activeSession ? (
          <div className="session-split">
            <ChatPanel
              tab={activeSession}
              draft={drafts[activeSession.id] ?? ""}
              onDraftChange={(text) => {
                setDrafts((previous) => ({ ...previous, [activeSession.id]: text }));
              }}
              items={transcripts[activeSession.id] ?? []}
              focusEventId={focusEventId}
              promptFocus={promptFocus}
              chatRef={chatRef}
              onSend={sendPrompt}
              onInterrupt={() => {
                void window.switcheroo.cancelPrompt(activeSession.id).catch(console.error);
              }}
              onClose={() => void window.switcheroo.closeSession(activeSession.id)}
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
            <SessionNotes
              sessionId={activeSession.id}
              value={sessionNotes.notes[activeSession.id] ?? ""}
              width={sessionNotes.widths[activeSession.id] ?? defaultNotesWidth}
              scrollRef={notesScrollRef}
              onChange={(text) => sessionNotes.setNote(activeSession.id, text)}
              onWidthChange={(width) => sessionNotes.setWidth(activeSession.id, width)}
            />
          </div>
        ) : (
          <section className="panel">
            <div className="empty">Select or create a session tab to begin.</div>
          </section>
        )}
      </div>

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
          onCancel={() => setShowNewTab(false)}
          onCreate={createSession}
        />
      )}
    </div>
  );
}
