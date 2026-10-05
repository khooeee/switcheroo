import { useEffect, useState } from "react";
import type { AgentKind } from "../../../shared/agentKind";

// Last answer from main, so reopening the modal does not flash unavailable agents.
let cached: AgentKind[] | null = null;

/** Installed agents; null until the main process first answers. Rechecks on mount. */
export function useAvailableAgents(): AgentKind[] | null {
  const [available, setAvailable] = useState(cached);

  useEffect(() => {
    let live = true;
    window.switcheroo.availableAgents().then(
      (kinds) => {
        cached = kinds;
        if (live) setAvailable(kinds);
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, []);

  return available;
}
