import { useEffect, useState } from "react";
import type { ActiveTabId } from "../../../shared/activeTabId";
import type { Session } from "../../../shared/session";
import { visibleTabOrder } from "../../../shared/tabNav/visibleTabOrder";
import { dialogOpen } from "../shortcuts/dialogOpen";
import { TabHistory } from "./TabHistory";

/** Go menu back/forward through previously selected tabs, skipping closed or filtered-out sessions. */
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
    window.addEventListener("switcheroo:session-back", onBack);
    window.addEventListener("switcheroo:session-forward", onForward);
    return () => {
      window.removeEventListener("switcheroo:session-back", onBack);
      window.removeEventListener("switcheroo:session-forward", onForward);
    };
  }, [history, pinned, unpinned, activeTabId, selectTab, disabled, filterQuery]);
}
