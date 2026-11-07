import { useEffect, useState } from "react";
import type { ActiveTabId } from "../../../shared/activeTabId";
import type { Session } from "../../../shared/session";
import { visibleTabOrder } from "../../../shared/tabNav/visibleTabOrder";
import { dialogOpen } from "../shortcuts/dialogOpen";
import { isMac } from "../shortcuts/isMac";
import { modKey } from "../shortcuts/modKey";
import { TabHistory } from "./TabHistory";

/** A text field with text in it, where Cmd+Left/Right moves the cursor to the line start/end. */
function editingText(target: EventTarget | null): boolean {
  return (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) && target.value !== "";
}

/** Back/forward through previously selected tabs, skipping closed or filtered-out sessions. Go menu, plus Cmd+Left/Right on macOS. */
export function useTabHistory(
  pinned: Session[],
  unpinned: Session[],
  activeTabId: ActiveTabId,
  selectTab: (id: string) => void,
  disabled: boolean,
  filterQuery: string,
): void {
  const [history] = useState(() => new TabHistory());

  useEffect(() => {
    if (activeTabId) history.record(activeTabId);
  }, [history, activeTabId]);

  useEffect(() => {
    const step = (delta: 1 | -1) => {
      if (disabled || dialogOpen()) return;
      const id = history.step(delta, activeTabId, visibleTabOrder(pinned, unpinned, filterQuery));
      if (id) selectTab(id);
    };
    const onBack = () => step(-1);
    const onForward = () => step(1);
    const onKey = (event: KeyboardEvent) => {
      if (!isMac || event.defaultPrevented || event.isComposing || editingText(event.target)) return;
      const delta = modKey(event, "arrowleft") ? -1 : modKey(event, "arrowright") ? 1 : 0;
      if (!delta) return;
      event.preventDefault();
      step(delta);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("switcheroo:session-back", onBack);
    window.addEventListener("switcheroo:session-forward", onForward);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("switcheroo:session-back", onBack);
      window.removeEventListener("switcheroo:session-forward", onForward);
    };
  }, [history, pinned, unpinned, activeTabId, selectTab, disabled, filterQuery]);
}
