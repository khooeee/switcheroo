import type { ActiveTabId } from "../../shared/activeTabId";
import type { PersistedState } from "../../shared/persistedState";
import { SWITCHBOARD_ID } from "../../shared/switchboardId";
import { loadSessionMeta } from "../sessionMeta";
import { sessionFromMeta } from "../sessionFromMeta";
import { loadSwitchboardTurns, saveSwitchboardTurns } from "../switchboardEvents";
import { finalizeStalledTurns } from "../finalizeStalledTurns";
import { loadListsFromPersisted } from "../railLists/loadListsFromPersisted";
import type { SessionDeps } from "./SessionDeps";

/** Rebuild rail sessions, active tab and Switchboard history from the saved state file. */
export async function restoreSavedState(
  { state, hydration }: SessionDeps,
  saved: PersistedState,
): Promise<void> {
  const { lists, openIds } = loadListsFromPersisted(saved.pinned, saved.unpinned);
  state.railLists = lists;
  await Promise.all(
    openIds.map(async (id) => {
      const meta = await loadSessionMeta(id);
      state.sessions.set(id, sessionFromMeta(id, meta));
    }),
  );
  state.activeTabId = resolveActiveTabId(state.sessions, saved.activeTabId, openIds);
  const openSessionIds = new Set(openIds);
  const loadedSwitchboard = await loadSwitchboardTurns();
  const switchboardTurns = finalizeStalledTurns(loadedSwitchboard);
  const navigableIds = new Set(openSessionIds);
  const titles = new Map<string, string>(
    [...state.sessions.entries()].map(([id, session]) => [id, session.title]),
  );
  const closedIds = [
    ...new Set(switchboardTurns.map((e) => e.sessionId)),
  ].filter((id) => id && !openSessionIds.has(id));
  await Promise.all(
    closedIds.map(async (sessionId) => {
      const meta = await loadSessionMeta(sessionId);
      if (!meta) return;
      navigableIds.add(sessionId);
      titles.set(sessionId, meta.title);
    }),
  );
  state.bus.restore(
    switchboardTurns.map((e) => ({
      ...e,
      sessionTitle: titles.get(e.sessionId) ?? e.sessionTitle,
      navigable: navigableIds.has(e.sessionId),
    })),
  );
  const parentId = state.activeParentSessionId();
  if (parentId) await hydration.ensure(parentId);
  if (switchboardTurns !== loadedSwitchboard) await saveSwitchboardTurns(state.bus.list());
}

function resolveActiveTabId(
  sessions: SessionDeps["state"]["sessions"],
  saved: ActiveTabId,
  openIds: string[],
): ActiveTabId {
  if (saved === SWITCHBOARD_ID) return SWITCHBOARD_ID;
  if (openIds.includes(saved)) return saved;
  for (const id of openIds) {
    const session = sessions.get(id);
    if (session?.tabs.some((tab) => tab.tabId === saved)) return saved;
  }
  return SWITCHBOARD_ID;
}
