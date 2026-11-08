import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { voiceToggleLabel } from "../../../shared/voiceToggleLabel";
import { MicIcon } from "./MicIcon";
import { useVoiceOnChime } from "./useVoiceOnChime";
import { voiceKeyPresence } from "./voiceKeyPresence";
import { VoiceSettingsModal } from "./VoiceSettingsModal";
import { voiceStatusStore } from "./voiceStatusStore";
import "./voice.css";

const OPEN_SETTINGS = "switcheroo:voice-settings";

/** Rail footer mic (hidden without a key): shows the voice state, toggles it, chimes when it turns on, and hosts Voice Settings. */
export function VoiceButton() {
  const status = useSyncExternalStore(voiceStatusStore.subscribe, voiceStatusStore.getSnapshot);
  const hasKey = useSyncExternalStore(voiceKeyPresence.subscribe, voiceKeyPresence.getSnapshot);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useVoiceOnChime();

  useEffect(() => {
    const open = () => setSettingsOpen(true);
    window.addEventListener(OPEN_SETTINGS, open);
    return () => window.removeEventListener(OPEN_SETTINGS, open);
  }, []);

  const tooltip = [voiceToggleLabel(status.state), status.error && `— ${status.error}`]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {hasKey && (
        <div className="rail-voice">
          <button
            type="button"
            className={`rail-session voice-button voice-${status.state} voice-${status.activity}`}
            data-tooltip={tooltip}
            data-tooltip-align="center"
            aria-label={voiceToggleLabel(status.state)}
            aria-pressed={status.state === "listening"}
            onClick={() => void window.switcheroo.toggleVoice()}
            onContextMenu={(event) => {
              event.preventDefault();
              setSettingsOpen(true);
            }}
          >
            <MicIcon />
            {status.error && status.state === "off" && <span className="voice-error-dot" aria-hidden="true" />}
          </button>
        </div>
      )}
      {settingsOpen && createPortal(<VoiceSettingsModal onClose={() => setSettingsOpen(false)} />, document.body)}
    </>
  );
}
