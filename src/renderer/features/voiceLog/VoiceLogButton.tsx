import { useSyncExternalStore } from "react";
import { voiceKeyPresence } from "../voice/voiceKeyPresence";
import { VoiceLogIcon } from "./VoiceLogIcon";
import { voiceLogView } from "./voiceLogView";
import "./voiceLog.css";

/** Rail footer button beside the mic (hidden without a key): shows or hides the Voice Log. */
export function VoiceLogButton() {
  const hasKey = useSyncExternalStore(voiceKeyPresence.subscribe, voiceKeyPresence.getSnapshot);
  const open = useSyncExternalStore(voiceLogView.subscribe, voiceLogView.getSnapshot);
  if (!hasKey) return null;
  const label = open ? "Hide Voice Log" : "Show Voice Log";

  return (
    <div className="rail-voice-log">
      <button
        type="button"
        className={`rail-session ${open ? "active" : ""}`}
        data-tooltip={label}
        data-tooltip-align="center"
        aria-label={label}
        aria-pressed={open}
        onClick={voiceLogView.toggle}
      >
        <VoiceLogIcon />
      </button>
    </div>
  );
}
