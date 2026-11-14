import { useEffect, useState } from "react";
import type { ActiveTabId } from "../../../shared/activeTabId";
import type { Session } from "../../../shared/session";
import { visibleTabOrder } from "../../../shared/tabNav/visibleTabOrder";
import { dialogOpen } from "../shortcuts/dialogOpen";
import { isMac } from "../shortcuts/isMac";
import { modKey } from "../shortcuts/modKey";
import { TabHistory } from "./TabHistory";

/** Back (-1) or forward (1) for Cmd+[ / Cmd+] on macOS and Alt+Left / Alt+Right elsewhere. */
function historyKeyStep(event: KeyboardEvent): 1 | -1 | null {
  if (isMac) return modKey(event, "[") ? -1 : modKey(event, "]") ? 1 : null;
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  return event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : null;
}

/** Back/forward shortcuts through previously selected tabs, skipping closed or filtered-out sessions. */
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
    const onKey = (event: KeyboardEvent) => {
      if (disabled || event.defaultPrevented || event.isComposing || dialogOpen()) return;
      const delta = historyKeyStep(event);
      if (!delta) return;
      event.preventDefault();
      const id = history.step(delta, activeTabId, visibleTabOrder(pinned, unpinned, filterQuery));
      if (id) selectTab(id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [history, pinned, unpinned, activeTabId, selectTab, disabled, filterQuery]);
}
