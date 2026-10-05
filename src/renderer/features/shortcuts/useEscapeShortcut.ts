import { useEffect } from "react";
import type { Session, SessionTab } from "../../../shared/session";

/** Escape closes Find, else stops the running agent, else closes the right rail. */
export function useEscapeShortcut({
  activeSession,
  activeTerminalTab,
  blocked,
  findOpen,
  rightRailOpen,
  setFindOpen,
  setFindQuery,
  onCloseRightRail,
}: {
  activeSession: Session | null;
  activeTerminalTab: SessionTab | null;
  blocked: boolean;
  findOpen: boolean;
  rightRailOpen: boolean;
  setFindOpen: (open: boolean) => void;
  setFindQuery: (query: string) => void;
  onCloseRightRail: () => void;
}): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if (event.key !== "Escape") return;
      if (event.defaultPrevented || event.repeat || event.isComposing || blocked) return;
      if (document.querySelector('[role="menu"]')) return;
      if (findOpen) {
        setFindOpen(false);
        setFindQuery("");
        return;
      }
      if (!activeTerminalTab && activeSession?.status === "running") {
        event.preventDefault();
        void window.switcheroo.cancelPrompt(activeSession.id).catch(console.error);
        return;
      }
      if (rightRailOpen) {
        event.preventDefault();
        onCloseRightRail();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    activeSession,
    activeTerminalTab,
    blocked,
    findOpen,
    rightRailOpen,
    setFindOpen,
    setFindQuery,
    onCloseRightRail,
  ]);
}
