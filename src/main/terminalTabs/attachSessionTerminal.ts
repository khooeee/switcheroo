import { findChildTab } from "../../shared/tabNav/findChildTab";
import type { TerminalHostApi } from "./TerminalHostApi";

export function attachSessionTerminal(host: TerminalHostApi, tabId: string): void {
  const found = findChildTab(host.sessions.values(), tabId);
  if (!found || found.tab.kind !== "terminal") return;
  host.terminals.ensure(tabId, found.tab.cwd || found.session.cwd);
}
