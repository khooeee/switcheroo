import { useEffect, useRef, useState } from "react";
import { ipcErrorMessage } from "../../../shared/ipcErrorMessage";
import { trapModalTabFocus } from "../modals/trapModalTabFocus";
import { applyStoredTheme } from "../theme/theme";
import { VoiceSettingsFields } from "../voice/VoiceSettingsFields";
import { voiceKeyPresence } from "../voice/voiceKeyPresence";
import { getAppSettingsCache, patchAppSettings } from "./appSettingsCache";
import { draftFromSettings } from "./draftFromSettings";
import { GeneralSettingsFields } from "./GeneralSettingsFields";
import { patchFromDraft } from "./patchFromDraft";
import { RemoteSettingsFields } from "./RemoteSettingsFields";
import type { SettingsDraft } from "./SettingsDraft";
import "../modals/modal.css";
import "./settingsModal.css";

/** General, voice and remote settings; nothing saves until Save except the remote access checkbox. */
export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [draft, setDraft] = useState(() => draftFromSettings(getAppSettingsCache()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onChange = (patch: Partial<SettingsDraft>) => setDraft((prev) => ({ ...prev, ...patch }));

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
      if (draft.voiceKey !== null) {
        await window.switcheroo.setVoiceKey(draft.voiceKey);
        voiceKeyPresence.refresh();
      }
      await patchAppSettings(patchFromDraft(draft, getAppSettingsCache()));
      applyStoredTheme();
      onClose();
    } catch (err) {
      setError(ipcErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div ref={dialogRef} className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>
        <div className="settings-body">
          <GeneralSettingsFields draft={draft} busy={busy} onChange={onChange} />
          <VoiceSettingsFields draft={draft} busy={busy} onChange={onChange} />
          <RemoteSettingsFields draft={draft} busy={busy} onChange={onChange} />
        </div>
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
