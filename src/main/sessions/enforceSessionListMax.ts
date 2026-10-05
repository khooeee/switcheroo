import { getAppSettings } from "../appSettings";
import { overflowSessionIds } from "../overflowSessionIds";
import { softCloseSession } from "../softCloseSession";
import type { SessionDeps } from "./SessionDeps";
import { softCloseHost } from "./softCloseHost";

/** Soft-close oldest rail sessions on startup when over sessionListMax. */
export async function enforceSessionListMax(deps: SessionDeps): Promise<boolean> {
  const { state } = deps;
  const parentId = state.activeParentSessionId();
  const protect = parentId ?? undefined;
  const max = getAppSettings().sessionListMax;
  const unpinnedCap = Math.max(0, max - state.railLists.pinnedIds.length);
  const toClose = overflowSessionIds(
    state.railLists.unpinnedIds,
    unpinnedCap,
    protect,
  );
  if (toClose.length === 0) return false;
  for (const id of toClose) await softCloseSession(softCloseHost(deps), id);
  state.emitSessions();
  return true;
}
