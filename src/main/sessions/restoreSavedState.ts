import type { PersistedState } from "../../shared/persistedState";
import { loadSessionMeta } from "../storage/sessionMeta";
import { sessionFromMeta } from "../storage/sessionFromMeta";
import { loadListsFromPersisted } from "../railLists/loadListsFromPersisted";
import { removeSessionFromLists } from "../railLists/removeSessionFromLists";
import type { SessionDeps } from "./SessionDeps";

/** Rebuild rail sessions and the active tab from the saved state file. */
export async function restoreSavedState(
  { state, hydration }: SessionDeps,
  saved: PersistedState,
): Promise<void> {
  const { lists, openIds: savedIds } = loadListsFromPersisted(saved.pinned, saved.unpinned);
  const metas = await Promise.all(savedIds.map((id) => loadSessionMeta(id)));
  // No meta (missing, or an agent Switcheroo no longer runs): hydration would drop it on open, so drop it now.
  const openIds = savedIds.filter((_, i) => metas[i]);
  state.railLists = savedIds.reduce(
    (next, id, i) => (metas[i] ? next : removeSessionFromLists(next, id)),
    lists,
  );
  savedIds.forEach((id, i) => {
    const meta = metas[i];
    if (meta) state.sessions.set(id, sessionFromMeta(id, meta));
  });
  // Anything else (none saved, a closed session, older builds' "switchboard") opens the top of the rail.
  state.activeTabId = openIds.includes(saved.activeTabId) ? saved.activeTabId : openIds[0] ?? null;
  if (state.activeTabId) await hydration.ensure(state.activeTabId);
}
