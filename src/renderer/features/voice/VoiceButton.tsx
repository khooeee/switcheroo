import { useSyncExternalStore } from "react";
import { voiceToggleLabel } from "../../../shared/voiceToggleLabel";
import { OPEN_SETTINGS_EVENT } from "../settings/openSettingsEvent";
import { MicIcon } from "./MicIcon";
import { useVoiceOnChime } from "./useVoiceOnChime";
import { voiceKeyPresence } from "./voiceKeyPresence";
import { voiceStatusStore } from "./voiceStatusStore";
import { voiceTooltip } from "./voiceTooltip";
import "./voice.css";

/** Rail footer mic (hidden without a key): shows the voice state, toggles it, chimes when it turns on; right-click opens Settings. */
export function VoiceButton() {
  const status = useSyncExternalStore(voiceStatusStore.subscribe, voiceStatusStore.getSnapshot);
  const hasKey = useSyncExternalStore(voiceKeyPresence.subscribe, voiceKeyPresence.getSnapshot);
  useVoiceOnChime();
  if (!hasKey) return null;

  return (
    <div className="rail-voice">
      <button
        type="button"
        className={`rail-session voice-button voice-${status.state} voice-${status.activity}`}
        data-tooltip={voiceTooltip(status)}
        data-tooltip-align="center"
        aria-label={voiceToggleLabel(status.state)}
        aria-pressed={status.state === "listening"}
        onClick={() => void window.switcheroo.toggleVoice()}
        onContextMenu={(event) => {
          event.preventDefault();
          window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT));
        }}
      >
        <MicIcon />
        {status.error && status.state === "off" && <span className="voice-error-dot" aria-hidden="true" />}
      </button>
    </div>
  );
}
