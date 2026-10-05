import type { ActiveTabId, Session } from "../shared/types";
import { SWITCHBOARD_ID } from "../shared/types";
import { findChildTab, sessionIdForTab } from "../shared/tabNav";
import { sessionPinMenuState, type SessionPinMenuState } from "./sessionPinMenuState";

type MenuCtx = {
  activeTabId: ActiveTabId;
  sessions: Map<string, Session>;
  pinnedIds: string[];
  supportsFork: (agent: Session["agent"]) => boolean;
};

export function activeParentSessionId(ctx: Pick<MenuCtx, "activeTabId" | "sessions">): string | null {
  return sessionIdForTab(ctx.activeTabId, ctx.sessions.values());
}

export function activeIsChildTab(ctx: Pick<MenuCtx, "activeTabId" | "sessions">): boolean {
  if (ctx.activeTabId === SWITCHBOARD_ID) return false;
  return findChildTab(ctx.sessions.values(), ctx.activeTabId) !== null;
}

export function activePinMenuState(ctx: MenuCtx): SessionPinMenuState {
  const parentId = activeParentSessionId(ctx);
  if (activeIsChildTab(ctx)) {
    const pinned = !!parentId && ctx.pinnedIds.includes(parentId);
    return { label: pinned ? "Unpin" : "Pin", enabled: false };
  }
  return sessionPinMenuState(
    parentId ?? SWITCHBOARD_ID,
    ctx.pinnedIds,
    parentId ? ctx.sessions.has(parentId) : false,
  );
}

export function activeRenameMenuEnabled(ctx: Pick<MenuCtx, "activeTabId" | "sessions">): boolean {
  if (ctx.activeTabId === SWITCHBOARD_ID) return false;
  if (ctx.sessions.has(ctx.activeTabId)) return true;
  return findChildTab(ctx.sessions.values(), ctx.activeTabId) !== null;
}

export function activeUnreadMenuEnabled(ctx: Pick<MenuCtx, "activeTabId" | "sessions">): boolean {
  if (activeIsChildTab(ctx)) return false;
  return ctx.activeTabId !== SWITCHBOARD_ID && ctx.sessions.has(ctx.activeTabId);
}

export function activeForkMenuEnabled(ctx: MenuCtx): boolean {
  if (activeIsChildTab(ctx)) return false;
  const session = ctx.sessions.get(ctx.activeTabId);
  return !!session && ctx.supportsFork(session.agent);
}

export function activeStopMenuEnabled(ctx: Pick<MenuCtx, "activeTabId" | "sessions">): boolean {
  if (activeIsChildTab(ctx)) return false;
  if (ctx.activeTabId === SWITCHBOARD_ID) return false;
  return ctx.sessions.get(ctx.activeTabId)?.status === "running";
}

export function activeNewTerminalMenuEnabled(
  ctx: Pick<MenuCtx, "activeTabId" | "sessions">,
): boolean {
  return activeParentSessionId(ctx) !== null;
}

export function activeOpenInCursorEnabled(
  ctx: Pick<MenuCtx, "activeTabId" | "sessions">,
): boolean {
  const parentId = activeParentSessionId(ctx);
  if (!parentId) return false;
  return !!ctx.sessions.get(parentId)?.cwd.trim();
}
