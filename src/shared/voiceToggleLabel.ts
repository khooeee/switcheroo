import type { VoiceStatus } from "./voiceStatus";

/** What the toggle (menu, button) does next from `state`. */
export function voiceToggleLabel(state: VoiceStatus["state"]): string {
  switch (state) {
    case "off":
      return "Start Voice";
    case "connecting":
      return "Cancel Voice";
    case "listening":
      return "Mute Voice";
    case "muted":
      return "Unmute Voice";
  }
}
