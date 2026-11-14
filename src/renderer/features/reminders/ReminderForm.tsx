import { useState, type FormEvent } from "react";
import type { Reminder } from "../../../shared/reminder";
import type { ReminderInput } from "../../../shared/reminderInput";

function localDateTime(value: Date): string {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 19);
}

export function ReminderForm({ reminder, busy, onSave, onCancel }: {
  reminder: Reminder | null;
  busy: boolean;
  onSave: (input: ReminderInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [message, setMessage] = useState(reminder?.message ?? "");
  const [dueAt, setDueAt] = useState(() => localDateTime(
    reminder ? new Date(reminder.dueAt) : new Date(Date.now() + 15 * 60_000),
  ));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    void onSave({ id: reminder?.id, message, dueAt: new Date(dueAt).toISOString() });
  };

  return (
    <form className="reminder-form" onSubmit={submit}>
      <h3>{reminder ? "Edit reminder" : "New reminder"}</h3>
      <label>
        Message
        <textarea autoFocus required rows={3} value={message} disabled={busy}
          onChange={(event) => setMessage(event.target.value)} />
      </label>
      <label>
        Due at (local time)
        <input type="datetime-local" required step="1" value={dueAt} disabled={busy}
          onChange={(event) => setDueAt(event.target.value)} />
      </label>
      <div className="reminder-actions">
        <button type="button" className="btn" disabled={busy} onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn primary" disabled={busy || !message.trim()}>
          {busy ? "Saving…" : "Save reminder"}
        </button>
      </div>
    </form>
  );
}
