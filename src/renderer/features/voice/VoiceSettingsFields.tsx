import { useEffect, useRef, useState } from "react";
import type { VoiceKeyInfo } from "../../../shared/voiceKeyInfo";
import { VOICE_REASONING_EFFORTS, type VoiceReasoningEffort } from "../../../shared/voiceReasoningEffort";
import type { SettingsFieldsProps } from "../settings/SettingsFieldsProps";

/** Stand-in shown for a saved key, which never leaves main. */
const KEY_MASK = "•".repeat(16);

const REASONING_LABELS: Record<VoiceReasoningEffort, string> = {
  NONE: "None (fastest)",
  MINIMAL: "Minimal",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  DEFAULT: "Model default",
};

/** Inworld key (write-only; stored encrypted in main; clear the field to remove it), model, reasoning, voice, language, idle timeout. */
export function VoiceSettingsFields({ draft, busy, onChange }: SettingsFieldsProps) {
  const [keyInfo, setKeyInfo] = useState<VoiceKeyInfo | null>(null);
  const keyRef = useRef<HTMLInputElement>(null);
  const key = draft.voiceKey;

  useEffect(() => {
    void window.switcheroo.getVoiceKeyInfo().then((info) => {
      setKeyInfo(info);
      if (!info.hasKey) keyRef.current?.focus();
    });
  }, []);

  return (
    <>
      <h3 className="settings-section">Voice</h3>
      <label>
        Inworld API key
        <input
          ref={keyRef}
          type="password"
          value={key ?? (keyInfo?.hasKey ? KEY_MASK : "")}
          disabled={busy}
          onFocus={(e) => key === null && e.target.select()}
          onChange={(e) => onChange({ voiceKey: key === null ? e.target.value.replace(/•/g, "") : e.target.value })}
          placeholder="Paste the key from the Inworld Portal"
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      {keyInfo && !keyInfo.secure && (
        <div className="settings-warning">No OS keyring found, so the key is only obfuscated on disk.</div>
      )}
      <label>
        Model
        <input value={draft.voiceModel} disabled={busy} onChange={(e) => onChange({ voiceModel: e.target.value })} spellCheck={false} />
      </label>
      <div className="settings-note">
        See available models at{" "}
        <a href="https://inworld.ai/models" target="_blank" rel="noopener noreferrer">
          inworld.ai/models
        </a>
        .
      </div>
      <label>
        Reasoning
        <select
          value={draft.voiceReasoning}
          disabled={busy}
          onChange={(e) => onChange({ voiceReasoning: e.target.value as VoiceReasoningEffort })}
        >
          {VOICE_REASONING_EFFORTS.map((effort) => (
            <option key={effort} value={effort}>
              {REASONING_LABELS[effort]}
            </option>
          ))}
        </select>
      </label>
      <div className="settings-note">Reasoning delays spoken replies. Some models reject some levels.</div>
      <label>
        Voice
        <input value={draft.voiceName} disabled={busy} onChange={(e) => onChange({ voiceName: e.target.value })} spellCheck={false} />
      </label>
      <div className="settings-note">
        See available voices at{" "}
        <a href="https://platform.inworld.ai/voice-library" target="_blank" rel="noopener noreferrer">
          platform.inworld.ai/voice-library
        </a>
        .
      </div>
      <label>
        Language
        <input
          value={draft.voiceLanguage}
          disabled={busy}
          onChange={(e) => onChange({ voiceLanguage: e.target.value })}
          placeholder="English"
        />
      </label>
      <label>
        Turn voice off after idle minutes (0 = never)
        <input
          type="number"
          min={0}
          value={draft.voiceIdleMinutes}
          disabled={busy}
          onChange={(e) => onChange({ voiceIdleMinutes: e.target.value })}
        />
      </label>
      <div className="settings-note">Model, reasoning, voice and language apply on the next connect.</div>
    </>
  );
}
