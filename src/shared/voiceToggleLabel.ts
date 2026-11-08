import type { VoiceStatus } from "./voiceStatus";

/** What the toggle (menu, button) does next from `state`. */
export function voiceToggleLabel(state: VoiceStatus["state"]): string {
  switch (state) {
    case "off":
      return "Start Voice";
    case "connecting":
    case "listening":
      return "Stop Voice";
  }
}
