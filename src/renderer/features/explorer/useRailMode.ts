import { useSyncExternalStore } from "react";
import type { RailMode } from "../../../shared/railMode";
import { railModeStore } from "./railModeStore";

export function useRailMode(): RailMode {
  return useSyncExternalStore(railModeStore.subscribe, railModeStore.getSnapshot);
}
