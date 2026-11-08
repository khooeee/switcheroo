import type { VoiceStatus } from "../../../shared/voiceStatus";
import { voiceToggleLabel } from "../../../shared/voiceToggleLabel";

/** Mic tooltip: the toggle action, with any error on its own line. */
export function voiceTooltip({ state, error }: VoiceStatus): string {
  if (!error) return voiceToggleLabel(state);
  if (state === "off") return `Voice failed: ${error} Click to try again.`;
  return `${voiceToggleLabel(state)}\nLast error: ${error}`;
}
