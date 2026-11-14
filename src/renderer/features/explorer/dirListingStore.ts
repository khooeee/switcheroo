import { errorMessage } from "../../../shared/errorMessage";
import { isSameJson } from "../sessions/isSameJson";
import type { DirListing } from "./DirListing";

type SessionListings = Record<string, DirListing>;

const NONE: SessionListings = {};
let listings: Record<string, SessionListings> = {};
/** Fetches in flight; `true` once another refresh was asked for meanwhile. */
const inflight = new Map<string, boolean>();
const listeners = new Set<() => void>();

function set(sessionId: string, relPath: string, listing: DirListing): void {
  const session = listings[sessionId] ?? NONE;
  if (session[relPath] && isSameJson(session[relPath], listing)) return;
  listings = { ...listings, [sessionId]: { ...session, [relPath]: listing } };
  listeners.forEach((listener) => listener());
}

async function fetchListing(sessionId: string, relPath: string): Promise<void> {
  const key = `${sessionId}\0${relPath}`;
  if (inflight.has(key)) {
    inflight.set(key, true);
    return;
  }
  inflight.set(key, false);
  try {
    const entries = await window.switcheroo.listSessionDir(sessionId, relPath);
    set(sessionId, relPath, { entries });
  } catch (err) {
    set(sessionId, relPath, { error: errorMessage(err) });
  }
  const again = inflight.get(key);
  inflight.delete(key);
  if (again) await fetchListing(sessionId, relPath);
}

/** Folder listings per session, loaded on first expand and refreshed when files change. */
export const dirListingStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  forSession(sessionId: string): SessionListings {
    return listings[sessionId] ?? NONE;
  },

  /** Load a folder unless it is already loaded or loading. */
  ensure(sessionId: string, relPath: string): void {
    if (listings[sessionId]?.[relPath] || inflight.has(`${sessionId}\0${relPath}`)) return;
    void fetchListing(sessionId, relPath);
  },

  /** Re-read a folder that is already loaded; only a changed listing notifies. */
  refresh(sessionId: string, relPath: string): void {
    if (listings[sessionId]?.[relPath]) void fetchListing(sessionId, relPath);
  },

  /** Every loaded folder of a session (for refreshing after outside changes). */
  loadedPaths(sessionId: string): string[] {
    return Object.keys(listings[sessionId] ?? NONE);
  },
};
