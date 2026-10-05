import { findChildTab } from "../../shared/tabNav/findChildTab";
import { updateTabCwd } from "../tabs/updateTabCwd";
import type { TerminalHostApi } from "./TerminalHostApi";

export function applySessionTerminalCwd(
  host: Pick<TerminalHostApi, "sessions" | "emitSessions">,
  tabId: string,
  cwd: string,
): void {
  const found = findChildTab(host.sessions.values(), tabId);
  if (!found || found.tab.kind !== "terminal") return;
  if (found.tab.cwd === cwd) return;
  found.session.tabs = updateTabCwd(found.session.tabs, tabId, cwd);
  host.emitSessions();
}
