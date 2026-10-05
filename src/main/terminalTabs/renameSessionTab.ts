import { findChildTab } from "../../shared/tabNav/findChildTab";
import { renameTabInList } from "../tabs/renameTabInList";
import type { TerminalHostApi } from "./TerminalHostApi";

export function renameSessionTab(host: TerminalHostApi, tabId: string, title: string): void {
  const found = findChildTab(host.sessions.values(), tabId);
  if (!found) return;
  const next = renameTabInList(found.session.tabs, tabId, title);
  if (!next) return;
  found.session.tabs = next;
  host.emitSessions();
  host.persist();
}
