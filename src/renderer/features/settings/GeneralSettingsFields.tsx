import type { Theme } from "../../../shared/appSettings";
import type { SettingsFieldsProps } from "./SettingsFieldsProps";

/** Theme, completion sound, and rail size. */
export function GeneralSettingsFields({ draft, busy, onChange }: SettingsFieldsProps) {
  return (
    <>
      <label>
        Theme
        <select value={draft.theme} disabled={busy} onChange={(e) => onChange({ theme: e.target.value as Theme })}>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </label>
      <label className="modal-check">
        <input
          type="checkbox"
          checked={draft.soundEnabled}
          disabled={busy}
          onChange={(e) => onChange({ soundEnabled: e.target.checked })}
        />
        Play a sound when a turn finishes or a reminder is due
      </label>
      <label>
        Max sessions in the list (0 = unlimited)
        <input
          type="number"
          min={0}
          value={draft.sessionListMax}
          disabled={busy}
          onChange={(e) => onChange({ sessionListMax: e.target.value })}
        />
      </label>
      <div className="settings-note">Oldest unpinned sessions close as new ones open.</div>
    </>
  );
}
