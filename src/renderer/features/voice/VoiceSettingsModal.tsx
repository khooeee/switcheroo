import { useEffect, useRef, useState } from "react";
import { errorMessage } from "../../../shared/errorMessage";
import type { VoiceKeyInfo } from "../../../shared/voiceKeyInfo";
import { VOICE_REASONING_EFFORTS, type VoiceReasoningEffort } from "../../../shared/voiceReasoningEffort";
import { trapModalTabFocus } from "../modals/trapModalTabFocus";
import { getAppSettingsCache, patchAppSettings } from "../settings/appSettingsCache";
import { voiceKeyPresence } from "./voiceKeyPresence";
import "../modals/modal.css";

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
export function VoiceSettingsModal({ onClose }: { onClose: () => void }) {
  const prefs = getAppSettingsCache();
  const [keyInfo, setKeyInfo] = useState<VoiceKeyInfo | null>(null);
  /** null until edited, so an untouched field keeps the saved key. */
  const [key, setKey] = useState<string | null>(null);
  const [model, setModel] = useState(prefs.voiceModel);
  const [reasoning, setReasoning] = useState(prefs.voiceReasoning);
  const [voiceName, setVoiceName] = useState(prefs.voiceName);
  const [language, setLanguage] = useState(prefs.voiceLanguage);
  const [idleMinutes, setIdleMinutes] = useState(String(prefs.voiceIdleMinutes));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void window.switcheroo.getVoiceKeyInfo().then((info) => {
      setKeyInfo(info);
      if (!info.hasKey) keyRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onClose();
        return;
      }
      if (dialogRef.current) trapModalTabFocus(event, dialogRef.current);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (key !== null) {
        await window.switcheroo.setVoiceKey(key);
        voiceKeyPresence.refresh();
      }
      const minutes = Number(idleMinutes);
      await patchAppSettings({
        voiceModel: model.trim() || prefs.voiceModel,
        voiceReasoning: reasoning,
        voiceName: voiceName.trim() || prefs.voiceName,
        voiceLanguage: language.trim() || prefs.voiceLanguage,
        voiceIdleMinutes: Number.isFinite(minutes) && minutes >= 0 ? Math.round(minutes) : prefs.voiceIdleMinutes,
      });
      onClose();
    } catch (err) {
      setError(errorMessage(err).replace(/^Error invoking remote method '[^']+': (Error: )?/, ""));
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div ref={dialogRef} className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Voice Settings</h2>
        <label>
          Inworld API key
          <input
            ref={keyRef}
            type="password"
            value={key ?? (keyInfo?.hasKey ? KEY_MASK : "")}
            disabled={busy}
            onFocus={(e) => key === null && e.target.select()}
            onChange={(e) => setKey(key === null ? e.target.value.replace(/•/g, "") : e.target.value)}
            placeholder="Paste the key from the Inworld Portal"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        {keyInfo && !keyInfo.secure && (
          <div className="voice-settings-warning">No OS keyring found, so the key is only obfuscated on disk.</div>
        )}
        <label>
          Model
          <input value={model} disabled={busy} onChange={(e) => setModel(e.target.value)} spellCheck={false} />
        </label>
        <div className="voice-settings-note">
          See available models at{" "}
          <a href="https://inworld.ai/models" target="_blank" rel="noopener noreferrer">
            inworld.ai/models
          </a>
          .
        </div>
        <label>
          Reasoning
          <select value={reasoning} disabled={busy} onChange={(e) => setReasoning(e.target.value as VoiceReasoningEffort)}>
            {VOICE_REASONING_EFFORTS.map((effort) => (
              <option key={effort} value={effort}>
                {REASONING_LABELS[effort]}
              </option>
            ))}
          </select>
        </label>
        <div className="voice-settings-note">Reasoning delays spoken replies. Some models reject some levels.</div>
        <label>
          Voice
          <input value={voiceName} disabled={busy} onChange={(e) => setVoiceName(e.target.value)} spellCheck={false} />
        </label>
        <div className="voice-settings-note">
          See available voices at{" "}
          <a href="https://platform.inworld.ai/voice-library" target="_blank" rel="noopener noreferrer">
            platform.inworld.ai/voice-library
          </a>
          .
        </div>
        <label>
          Language
          <input value={language} disabled={busy} onChange={(e) => setLanguage(e.target.value)} placeholder="English" />
        </label>
        <label>
          Turn voice off after idle minutes (0 = never)
          <input type="number" min={0} value={idleMinutes} disabled={busy} onChange={(e) => setIdleMinutes(e.target.value)} />
        </label>
        <div className="voice-settings-note">Model, reasoning, voice and language apply on the next connect.</div>
        {error && <div style={{ color: "var(--danger)" }}>{error}</div>}
        <div className="composer-actions" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" disabled={busy} onClick={() => void save()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
