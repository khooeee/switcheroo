import { useEffect, useRef, useState } from "react";
import { errorMessage } from "../../../shared/errorMessage";
import { ipcErrorMessage } from "../../../shared/ipcErrorMessage";
import type { Reminder } from "../../../shared/reminder";
import type { ReminderInput } from "../../../shared/reminderInput";
import { trapModalTabFocus } from "../modals/trapModalTabFocus";
import { ReminderForm } from "./ReminderForm";
import "../modals/modal.css";
import "./reminders.css";

export function RemindersModal({ onClose }: { onClose: () => void }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [readErrors, setReadErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Reminder | null | undefined>(undefined);
  const [revision, setRevision] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const blocked = busy || loading || readErrors.length > 0;

  // Poll only while open, including changes from agents, voice, and fired reminders.
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const result = await window.switcheroo.listReminders();
        if (stopped) return;
        setReminders(result.reminders);
        setReadErrors(result.errors);
      } catch (err) {
        if (!stopped) setReadErrors([errorMessage(err)]);
      } finally {
        if (!stopped) {
          setLoading(false);
          timer = setTimeout(() => void refresh(), 1000);
        }
      }
    };
    void refresh();
    return () => { stopped = true; clearTimeout(timer); };
  }, [revision]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!busy) {
          if (editing !== undefined) setEditing(undefined);
          else onClose();
        }
      }
      if (dialogRef.current) trapModalTabFocus(event, dialogRef.current);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, busy, editing]);

  const mutate = async (action: () => Promise<unknown>, saved = false) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      if (saved) setEditing(undefined);
    } catch (err) {
      setError(ipcErrorMessage(err));
    } finally {
      setBusy(false);
      setLoading(true);
      setRevision((value) => value + 1);
    }
  };
  const save = (input: ReminderInput) => mutate(() => window.switcheroo.saveReminder(input), true);

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div ref={dialogRef} className="modal reminders-modal" role="dialog" aria-modal="true"
        aria-labelledby="reminders-title" onClick={(event) => event.stopPropagation()}>
        <div className="reminders-header">
          <h2 id="reminders-title">Reminders</h2>
          <button autoFocus type="button" className="btn" disabled={busy} onClick={onClose}>Close</button>
        </div>
        <div className="reminders-body">
          {readErrors.length > 0 && <div className="reminders-error" role="alert">{readErrors.join("; ")}</div>}
          {error && <div className="reminders-error" role="alert">{error}</div>}
          {loading && reminders.length === 0 ? <p>Loading reminders…</p> : (
            reminders.length === 0 && readErrors.length === 0 && <p className="reminders-empty">No pending reminders.</p>
          )}
          <ul className="reminders-list">
            {reminders.map((reminder) => (
              <li key={reminder.id} className="reminder-row">
                <div className="reminder-details">
                  <p>{reminder.message}</p>
                  <time dateTime={reminder.dueAt}>{new Date(reminder.dueAt).toLocaleString()}</time>
                </div>
                <div className="reminder-actions">
                  <button type="button" className="btn" disabled={blocked} onClick={() => {
                    setError(null);
                    setEditing(reminder);
                  }}>Edit</button>
                  <button type="button" className="btn" disabled={blocked} aria-label={`Cancel reminder: ${reminder.message}`}
                    onClick={() => void mutate(() => window.switcheroo.cancelReminder(reminder.id))}>Cancel reminder</button>
                </div>
              </li>
            ))}
          </ul>
          {editing !== undefined ? (
            <ReminderForm key={editing?.id ?? "new"} reminder={editing} busy={blocked} onSave={save}
              onCancel={() => setEditing(undefined)} />
          ) : (
            <button type="button" className="btn primary" disabled={blocked} onClick={() => {
              setError(null);
              setEditing(null);
            }}>Add reminder</button>
          )}
        </div>
      </div>
    </div>
  );
}
