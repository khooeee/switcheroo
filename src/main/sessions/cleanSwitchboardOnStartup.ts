import { getAppSettings } from "../appSettings";
import { saveSwitchboardTurns } from "../switchboardEvents";
import { switchboardCleanupCutoff } from "../switchboardCleanup";
import type { SessionState } from "./SessionState";

/** Age-out old Switchboard turns on startup. */
export async function cleanSwitchboardOnStartup(state: SessionState): Promise<void> {
  const cutoff = switchboardCleanupCutoff(getAppSettings().cleanSwitchboardTurnsOlderThanDays);
  if (cutoff == null) return;
  const removed = state.bus.removeOlderThan(cutoff);
  if (removed === 0) return;
  state.send("switchboard:turns", state.bus.list());
  await saveSwitchboardTurns(state.bus.list());
}
