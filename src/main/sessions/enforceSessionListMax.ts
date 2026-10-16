import type { Session } from "../../shared/session";
import { getAppSettings } from "../appSettings";
import { overflowSessionIds } from "./overflowSessionIds";
import { softCloseSession } from "./softCloseSession";
import type { SessionDeps } from "./SessionDeps";
import { softCloseHost } from "./softCloseHost";

/**
 * Soft-close oldest rail sessions when over sessionListMax. Spares the active
 * session, `keepId`, and busy ones (mid-turn, connecting, or with live terminals).
 */
export async function enforceSessionListMax(deps: SessionDeps, keepId?: string): Promise<boolean> {
  const { state } = deps;
  const isBusy = (session: Session) =>
    session.status === "running" ||
    session.status === "connecting" ||
    session.tabs.some((tab) => state.terminals.has(tab.tabId));
  const protect = new Set<string>();
  const parentId = state.activeParentSessionId();
  if (parentId) protect.add(parentId);
  if (keepId) protect.add(keepId);
  for (const session of state.sessions.values()) {
    if (isBusy(session)) protect.add(session.id);
  }
  const max = getAppSettings().sessionListMax;
  const unpinnedCap = Math.max(0, max - state.railLists.pinnedIds.length);
  const toClose = overflowSessionIds(state.railLists.unpinnedIds, unpinnedCap, protect);
  if (toClose.length === 0) return false;
  for (const id of toClose) await softCloseSession(softCloseHost(deps), id);
  state.emitSessions();
  return true;
}
