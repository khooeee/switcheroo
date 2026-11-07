import { useEffect } from "react";
import type { Session } from "../../../shared/session";
import { dialogOpen } from "./dialogOpen";

/** Escape closes Find, else stops the running agent, else closes the right rail, else stops an idle agent. */
export function useEscapeShortcut({
  activeSession,
  blocked,
  findOpen,
  rightRailOpen,
  setFindOpen,
  setFindQuery,
  onCloseRightRail,
}: {
  activeSession: Session | null;
  blocked: boolean;
  findOpen: boolean;
  rightRailOpen: boolean;
  setFindOpen: (open: boolean) => void;
  setFindQuery: (query: string) => void;
  onCloseRightRail: () => void;
}): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (dialogOpen()) return;
      if (event.key !== "Escape") return;
      if (event.defaultPrevented || event.repeat || event.isComposing || blocked) return;
      if (document.querySelector('[role="menu"]')) return;
      if (findOpen) {
        setFindOpen(false);
        setFindQuery("");
        return;
      }
      if (activeSession?.status === "running") {
        event.preventDefault();
        void window.switcheroo.cancelPrompt(activeSession.id).catch(console.error);
        return;
      }
      if (rightRailOpen) {
        event.preventDefault();
        onCloseRightRail();
        return;
      }
      // Like Claude Code's Esc: also stops work the agent started on its own, which ACP v1 does not report as running.
      if (activeSession?.status === "ready") {
        event.preventDefault();
        void window.switcheroo.cancelPrompt(activeSession.id).catch(console.error);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    activeSession,
    blocked,
    findOpen,
    rightRailOpen,
    setFindOpen,
    setFindQuery,
    onCloseRightRail,
  ]);
}
