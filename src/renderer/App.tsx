import { useCompletionSound } from "./features/sound/useCompletionSound";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ActiveTabId,
  AgentKind,
  MasterEvent,
  PermissionRequest,
  SessionTab,
  TranscriptItem,
} from "../shared/types";
import { MASTER_TAB_ID } from "../shared/types";
import { TabRail } from "./features/tabs/TabRail";
import { MasterFeed } from "./features/master/MasterFeed";
import { ChatPanel } from "./features/chat/ChatPanel";
import { useTabScrollPosition } from "./features/tabs/useTabScrollPosition";
import { useTabShortcuts } from "./features/tabs/useTabShortcuts";
import { useFocusPromptShortcut } from "./features/chat/useFocusPromptShortcut";
import { ThinkingIndicator } from "./features/chat/ThinkingIndicator";
import { FindBar } from "./features/find/FindBar";
import { DeleteTabModal } from "./features/tabs/DeleteTabModal";
import { NewTabModal } from "./features/tabs/NewTabModal";
import { useAgentQuestions } from "./features/permissions/useAgentQuestions";
import { PermissionBar } from "./features/permissions/PermissionBar";
import { TabNotes } from "./features/notes/TabNotes";
import { defaultNotesWidth } from "./features/notes/clampNotesWidth";
import { useSessionNotes } from "./features/notes/useSessionNotes";

export function App() {
  useCompletionSound();
  const [tabs, setTabs] = useState<SessionTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<ActiveTabId>(MASTER_TAB_ID);
  const [masterEvents, setMasterEvents] = useState<MasterEvent[]>([]);
  const [transcripts, setTranscripts] = useState<Record<string, TranscriptItem[]>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [permission, setPermission] = useState<PermissionRequest | null>(null);
  const askQuestion = useAgentQuestions(activeTabId);
  const [showNewTab, setShowNewTab] = useState(false);
  const [deleteTab, setDeleteTab] = useState<SessionTab | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [focusEventId, setFocusEventId] = useState<string | null>(null);
  const [promptFocus, setPromptFocus] = useState(0);
  const sessionNotes = useSessionNotes();
  const chatRef = useRef<HTMLDivElement>(null);
  const masterRef = useRef<HTMLDivElement>(null);
  const tabIdsRef = useRef<Set<string> | null>(null);
  useTabScrollPosition(activeTabId, activeTabId === MASTER_TAB_ID ? masterRef : chatRef);

  useEffect(() => {
    void window.switcheroo.listTabs().then(async (data) => {
      tabIdsRef.current = new Set(data.tabs.map((tab) => tab.id));
      setTabs(data.tabs);
      setActiveTabId(data.activeTabId);
      setMasterEvents(data.masterEvents);
      sessionNotes.hydrate(data.tabs);
      const next: Record<string, TranscriptItem[]> = {};
      for (const t of data.tabs) {
        next[t.id] = await window.switcheroo.getTranscript(t.id);
      }
      setTranscripts(next);
    });

    const unsubs = [
      window.switcheroo.onTabsChanged(({ tabs: t, activeTabId: a }) => {
        const ids = new Set(t.map((tab) => tab.id));
        tabIdsRef.current = ids;
        sessionNotes.prune(ids);
        setTabs(t);
        setActiveTabId(a);
        setMasterEvents((prev) => prev.filter((event) => ids.has(event.tabId)));
      }),
      window.switcheroo.onMasterReset(setMasterEvents),
      window.switcheroo.onMasterEvent((event) => {
        if (tabIdsRef.current && !tabIdsRef.current.has(event.tabId)) return;
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
      window.switcheroo.onTranscript(({ tabId, item, replaceId }) => {
        setTranscripts((prev) => {
          const list = [...(prev[tabId] ?? [])];
          if (replaceId) {
            const idx = list.findIndex((i) => i.id === replaceId);
            if (idx >= 0) {
              list[idx] = item;
              return { ...prev, [tabId]: list };
            }
          }
          const existing = list.findIndex((i) => i.id === item.id);
          if (existing >= 0) list[existing] = item;
          else list.push(item);
          return { ...prev, [tabId]: list };
        });
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setFindOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
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

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );

  const selectTab = useCallback((id: ActiveTabId) => {
    void window.switcheroo.setActiveTab(id);
    setFocusEventId(null);
    if (id !== MASTER_TAB_ID) setPromptFocus((n) => n + 1);
  }, []);

  const focusPrompt = useCallback(() => setPromptFocus((n) => n + 1), []);
  useTabShortcuts(tabs, activeTabId, selectTab, showNewTab || !!deleteTab);
  useFocusPromptShortcut(activeTabId !== MASTER_TAB_ID && !showNewTab && !deleteTab, focusPrompt);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if (e.key === "Escape") {
        if (e.defaultPrevented || e.repeat || e.isComposing || showNewTab) return;
        if (document.querySelector('[role="menu"]')) return;
        if (findOpen) {
          setFindOpen(false);
          setFindQuery("");
          return;
        }
        if (activeTab?.status !== "running") return;
        e.preventDefault();
        void window.switcheroo.cancelPrompt(activeTab.id).catch(console.error);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTab, showNewTab, findOpen]);

  const createTab = useCallback((agentKind: AgentKind, cwd: string, title: string) => {
    setShowNewTab(false);
    void window.switcheroo.createTab({ agentKind, cwd, title }).then((tab) => {
      setTranscripts((prev) => ({ ...prev, [tab.id]: prev[tab.id] ?? [] }));
    });
    return Promise.resolve();
  }, []);

  const sendPrompt = useCallback(
    async (text: string) => {
      if (!activeTab) return;
      await window.switcheroo.sendPrompt(activeTab.id, text);
    },
    [activeTab],
  );

  const onMasterClick = useCallback((event: MasterEvent) => {
    if (!event.navigable) return;
    void window.switcheroo.navigateToEvent(event.tabId, event.id);
  }, []);

  return (
    <div className="app">
      <TabRail
        tabs={tabs.filter((tab) => !tab.closed)}
        activeTabId={activeTabId}
        onSelect={selectTab}
        onAdd={() => setShowNewTab(true)}
        onClose={(id) => void window.switcheroo.closeTab(id)}
        onDelete={(id) => setDeleteTab(tabs.find((tab) => tab.id === id) ?? null)}
        onRename={(id, title) => void window.switcheroo.renameTab(id, title)}
        onReorder={(ids) => void window.switcheroo.reorderTabs(ids)}
      />

      <div className="main relative">
        {findOpen && (
          <FindBar
            key={activeTabId}
            query={findQuery}
            onQuery={setFindQuery}
            rootRef={activeTabId === MASTER_TAB_ID ? masterRef : chatRef}
            onClose={() => {
              setFindOpen(false);
              setFindQuery("");
            }}
          />
        )}

        {activeTabId === MASTER_TAB_ID ? (
          <section className="panel">
            <div className="panel-header">
              <h2>Switchboard</h2>
            </div>
            <div className="scroll" ref={masterRef}>
              <MasterFeed
                events={masterEvents}
                tabs={tabs}
                onClick={onMasterClick}
              />
              {tabs.some((tab) => tab.status === "running") && <ThinkingIndicator />}
            </div>
          </section>
        ) : activeTab ? (
          <div className="session-split">
            <ChatPanel
              tab={activeTab}
              draft={drafts[activeTab.id] ?? ""}
              onDraftChange={(text) => {
                setDrafts((previous) => ({ ...previous, [activeTab.id]: text }));
              }}
              items={transcripts[activeTab.id] ?? []}
              focusEventId={focusEventId}
              promptFocus={promptFocus}
              chatRef={chatRef}
              onSend={sendPrompt}
              onInterrupt={() => {
                void window.switcheroo.cancelPrompt(activeTab.id).catch(console.error);
              }}
              permission={permission?.tabId === activeTab.id ? permission : null}
              askQuestion={askQuestion?.tabId === activeTab.id ? askQuestion : null}
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
            <TabNotes
              tabId={activeTab.id}
              value={sessionNotes.notes[activeTab.id] ?? ""}
              width={sessionNotes.widths[activeTab.id] ?? defaultNotesWidth}
              onChange={(text) => sessionNotes.setNote(activeTab.id, text)}
              onWidthChange={(width) => sessionNotes.setWidth(activeTab.id, width)}
            />
          </div>
        ) : (
          <section className="panel">
            <div className="empty">Select or create a session tab to begin.</div>
          </section>
        )}
      </div>

      {permission && activeTabId === MASTER_TAB_ID && (
        <PermissionBar
          request={permission}
          onRespond={(optionId) => {
            void window.switcheroo.respondPermission(permission.requestId, optionId);
            setPermission(null);
          }}
        />
      )}

      {deleteTab && <DeleteTabModal tab={deleteTab} onCancel={() => setDeleteTab(null)}
        onDelete={(id) => window.switcheroo.deleteTab(id)} />}

      {showNewTab && (
        <NewTabModal
          onCancel={() => setShowNewTab(false)}
          onCreate={createTab}
        />
      )}
    </div>
  );
}
