import { useEffect, useMemo, useState } from "react";
import type { Session, SessionTab } from "../../../shared/types";
import { TerminalPanel } from "./TerminalPanel";
import "./terminalPanel.css";

function terminalHeader(
  sessions: Session[],
  tabId: string,
): { parentTitle: string; title: string; cwd: string } | null {
  for (const session of sessions) {
    const tab = session.tabs.find((item) => item.tabId === tabId);
    if (tab?.kind === "terminal") {
      return { parentTitle: session.title, title: tab.title, cwd: tab.cwd };
    }
  }
  return null;
}

/** Keep visited terminal views mounted so scrollback survives tab switches. */
export function TerminalStack({
  sessions,
  activeTab,
}: {
  sessions: Session[];
  activeTab: SessionTab | null;
}) {
  const liveIds = useMemo(() => {
    const ids = new Set<string>();
    for (const session of sessions) {
      for (const tab of session.tabs) {
        if (tab.kind === "terminal") ids.add(tab.tabId);
      }
    }
    return ids;
  }, [sessions]);

  const [opened, setOpened] = useState<string[]>([]);

  useEffect(() => {
    if (!activeTab || activeTab.kind !== "terminal") return;
    setOpened((prev) => (prev.includes(activeTab.tabId) ? prev : [...prev, activeTab.tabId]));
  }, [activeTab]);

  useEffect(() => {
    setOpened((prev) => {
      const next = prev.filter((id) => liveIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [liveIds]);

  const mounted = useMemo(() => {
    const ids = new Set(opened.filter((id) => liveIds.has(id)));
    if (activeTab?.kind === "terminal") ids.add(activeTab.tabId);
    return [...ids];
  }, [opened, liveIds, activeTab]);

  if (mounted.length === 0) return null;

  return (
    <div
      className="terminal-stack"
      hidden={!activeTab || activeTab.kind !== "terminal"}
      aria-hidden={!activeTab || activeTab.kind !== "terminal"}
    >
      {mounted.map((tabId) => {
        const header = terminalHeader(sessions, tabId);
        return (
          <TerminalPanel
            key={tabId}
            tabId={tabId}
            active={activeTab?.tabId === tabId}
            parentTitle={header?.parentTitle ?? ""}
            title={header?.title ?? ""}
            cwd={header?.cwd ?? ""}
          />
        );
      })}
    </div>
  );
}
