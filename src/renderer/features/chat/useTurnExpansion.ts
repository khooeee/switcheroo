import { useCallback, useEffect, useState } from "react";
import { getAppSettingsCache, subscribeAppSettings } from "../settings/appSettingsCache";

/**
 * Zen on → turns collapsed by default; click toggles expand.
 * Zen off → turns expanded by default; click toggles collapse.
 * Toggling zen clears per-turn overrides.
 */
export function useTurnExpansion() {
  const [zenMode, setZenMode] = useState(() => getAppSettingsCache().zenMode);
  const [overrides, setOverrides] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    return subscribeAppSettings(() => {
      const next = getAppSettingsCache().zenMode;
      setZenMode((prev) => {
        if (prev !== next) setOverrides(new Set());
        return next;
      });
    });
  }, []);

  const isExpanded = useCallback(
    (turnId: string) => (zenMode ? overrides.has(turnId) : !overrides.has(turnId)),
    [zenMode, overrides],
  );

  const toggle = useCallback((turnId: string) => {
    setOverrides((prev) => {
      const next = new Set(prev);
      if (next.has(turnId)) next.delete(turnId);
      else next.add(turnId);
      return next;
    });
  }, []);

  const forceExpand = useCallback((turnId: string) => {
    setOverrides((prev) => {
      const next = new Set(prev);
      if (zenMode) next.add(turnId);
      else next.delete(turnId);
      return next;
    });
  }, [zenMode]);

  return { isExpanded, toggle, forceExpand };
}
