import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ActiveTabId,
  AgentKind,
  CursorAskQuestionRequest,
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
import { ThinkingIndicator } from "./features/chat/ThinkingIndicator";
import { FindBar } from "./features/find/FindBar";
import { NewTabModal } from "./features/tabs/NewTabModal";
import { PermissionBar } from "./features/permissions/PermissionBar";

export function App() {
  const [tabs, setTabs] = useState<SessionTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<ActiveTabId>(MASTER_TAB_ID);
  const [masterEvents, setMasterEvents] = useState<MasterEvent[]>([]);
  const [transcripts, setTranscripts] = useState<Record<string, TranscriptItem[]>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [permission, setPermission] = useState<PermissionRequest | null>(null);
  const [askQuestion, setAskQuestion] = useState<CursorAskQuestionRequest | null>(null);
  const [showNewTab, setShowNewTab] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [focusEventId, setFocusEventId] = useState<string | null>(null);
  const [promptFocus, setPromptFocus] = useState(0);
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
      window.switcheroo.onAskQuestion((req) => setAskQuestion(req)),
      window.switcheroo.onNavigateToEvent(({ eventId }) => {
        setFocusEventId(eventId);
      }),
    ];

    const onFind = () => setFindOpen(true);
    const onNewSession = () => setShowNewTab(true);
    window.addEventListener("switcheroo:find", onFind);
    window.addEventListener("switcheroo:new-session", onNewSession);
    const onKey = (e: KeyboardEvent) => {
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !e.ctrlKey || e.metaKey || e.altKey || showNewTab) return;
      e.preventDefault();
      const order: ActiveTabId[] = [
        MASTER_TAB_ID,
        ...tabs.filter((tab) => !tab.closed).map((tab) => tab.id),
      ];
      const index = Math.max(0, order.indexOf(activeTabId));
      const step = e.shiftKey ? -1 : 1;
      const next = (index + step + order.length) % order.length;
      selectTab(order[next]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tabs, activeTabId, selectTab, showNewTab]);

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

  const searchRoot =
    activeTabId === MASTER_TAB_ID ? masterRef.current : chatRef.current;

  return (
    <div className="app">
      <TabRail
        tabs={tabs.filter((tab) => !tab.closed)}
        activeTabId={activeTabId}
        onSelect={selectTab}
        onAdd={() => setShowNewTab(true)}
        onClose={(id) => void window.switcheroo.closeTab(id)}
        onDelete={(id) => void window.switcheroo.deleteTab(id)}
        onRename={(id, title) => void window.switcheroo.renameTab(id, title)}
        onReorder={(ids) => void window.switcheroo.reorderTabs(ids)}
      />

      <div className="main relative">
        {findOpen && (
          <FindBar
            query={findQuery}
            onQuery={setFindQuery}
            root={searchRoot}
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
                query={findQuery}
              />
              {tabs.some((tab) => tab.status === "running") && <ThinkingIndicator />}
            </div>
          </section>
        ) : activeTab ? (
          <>
            <ChatPanel
              tab={activeTab}
              draft={drafts[activeTab.id] ?? ""}
              onDraftChange={(text) => {
                setDrafts((previous) => ({ ...previous, [activeTab.id]: text }));
              }}
              items={transcripts[activeTab.id] ?? []}
              focusEventId={focusEventId}
              promptFocus={promptFocus}
              findQuery={findQuery}
              chatRef={chatRef}
              onSend={sendPrompt}
              permission={permission?.tabId === activeTab.id ? permission : null}
              askQuestion={askQuestion?.tabId === activeTab.id ? askQuestion : null}
              onPermission={(optionId) => {
                if (!permission) return;
                void window.switcheroo.respondPermission(permission.requestId, optionId);
                setPermission(null);
              }}
              onAsk={(outcome) => {
                if (!askQuestion) return;
                void window.switcheroo.respondAskQuestion(askQuestion.requestId, outcome);
                setAskQuestion(null);
              }}
            />
          </>
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

      {showNewTab && (
        <NewTabModal
          onCancel={() => setShowNewTab(false)}
          onCreate={createTab}
        />
      )}
    </div>
  );
}
