import { useEffect, useRef, useState } from "react";
import { errorMessage } from "../../../shared/errorMessage";
import type { VoiceKeyInfo } from "../../../shared/voiceKeyInfo";
import { trapModalTabFocus } from "../modals/trapModalTabFocus";
import { getAppSettingsCache, patchAppSettings } from "../settings/appSettingsCache";
import "../modals/modal.css";

/** Inworld key (write-only; stored encrypted in main), model, voice, idle mute. */
export function VoiceSettingsModal({ onClose }: { onClose: () => void }) {
  const prefs = getAppSettingsCache();
  const [keyInfo, setKeyInfo] = useState<VoiceKeyInfo | null>(null);
  const [key, setKey] = useState("");
  const [model, setModel] = useState(prefs.voiceModel);
  const [voiceName, setVoiceName] = useState(prefs.voiceName);
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

  const save = async (removeKey = false) => {
    setBusy(true);
    setError(null);
    try {
      if (removeKey || key.trim()) await window.switcheroo.setVoiceKey(removeKey ? "" : key);
      const minutes = Number(idleMinutes);
      await patchAppSettings({
        voiceModel: model.trim() || prefs.voiceModel,
        voiceName: voiceName.trim() || prefs.voiceName,
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
            value={key}
            disabled={busy}
            onChange={(e) => setKey(e.target.value)}
            placeholder={keyInfo?.hasKey ? "Saved. Type to replace it." : "Paste the key from the Inworld Portal"}
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
        <label>
          Voice
          <input value={voiceName} disabled={busy} onChange={(e) => setVoiceName(e.target.value)} spellCheck={false} />
        </label>
        <label>
          Mute the mic after this many idle minutes (0 = never)
          <input type="number" min={0} value={idleMinutes} disabled={busy} onChange={(e) => setIdleMinutes(e.target.value)} />
        </label>
        <div className="voice-settings-note">Model and voice apply on the next connect.</div>
        {error && <div style={{ color: "var(--danger)" }}>{error}</div>}
        <div className="composer-actions" style={{ justifyContent: "flex-end" }}>
          {keyInfo?.hasKey && (
            <button type="button" className="btn" disabled={busy} onClick={() => void save(true)} style={{ marginRight: "auto" }}>
              Remove Key
            </button>
          )}
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
