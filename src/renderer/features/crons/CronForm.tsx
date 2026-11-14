import { useState, type FormEvent } from "react";
import type { AgentKind } from "../../../shared/agentKind";
import { AGENT_LABELS } from "../../../shared/agentLabels";
import type { CronInput } from "../../../shared/cronInput";
import { errorMessage } from "../../../shared/errorMessage";
import { getAppSettingsCache } from "../settings/appSettingsCache";

export function CronForm({ cron, busy, onSave, onCancel }: {
  cron: CronInput | null;
  busy: boolean;
  onSave: (input: CronInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<CronInput>(() => cron ?? {
    title: "", agent: getAppSettingsCache().lastAgent, cwd: getAppSettingsCache().lastCwd,
    cron: "0 9 * * 1-5", prompt: "", enabled: false,
  });
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blocked = busy || picking;
  const patch = (value: Partial<CronInput>) => setDraft((current) => ({ ...current, ...value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!blocked) void onSave(draft);
  };
  const browse = async () => {
    setPicking(true);
    setError(null);
    try {
      const cwd = await window.switcheroo.pickFolder(draft.cwd);
      if (cwd) patch({ cwd });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPicking(false);
    }
  };

  return (
    <form className="cron-form" onSubmit={submit}>
      <h3>{cron ? "Edit cron" : "New cron"}</h3>
      <label>
        Title (optional)
        <input autoFocus value={draft.title ?? ""} disabled={blocked}
          onChange={(event) => patch({ title: event.target.value })} placeholder="Daily review YYYY-MM-DD HH:MM" />
      </label>
      <p className="crons-hint">Titles can include YYYY-MM-DD, HH:MM, or H:MM for the run’s local date and time.</p>
      <div className="cron-fields">
        <label>
          Agent
          <select value={draft.agent} disabled={blocked}
            onChange={(event) => patch({ agent: event.target.value as AgentKind })}>
            {Object.entries(AGENT_LABELS).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}
          </select>
        </label>
        <label>
          Schedule (local time)
          <input required value={draft.cron} disabled={blocked} spellCheck={false} aria-describedby="cron-schedule-help"
            onChange={(event) => patch({ cron: event.target.value })} placeholder="0 9 * * 1-5" />
        </label>
      </div>
      <p id="cron-schedule-help" className="crons-hint">Minute · hour · day of month · month · day of week. Example: 0 9 * * 1-5 runs weekdays at 9 AM.</p>
      <label>
        Folder
        <div className="cron-folder">
          <input required value={draft.cwd} disabled={blocked} spellCheck={false} placeholder="/path/to/project"
            onChange={(event) => patch({ cwd: event.target.value })} />
          <button type="button" className="btn" disabled={blocked} onClick={() => void browse()}>Browse</button>
        </div>
      </label>
      <label>
        Prompt
        <textarea required rows={4} value={draft.prompt} disabled={blocked}
          onChange={(event) => patch({ prompt: event.target.value })} />
      </label>
      <label className="modal-check">
        <input type="checkbox" checked={draft.enabled === true} disabled={blocked}
          onChange={(event) => patch({ enabled: event.target.checked })} />
        Enabled
      </label>
      {error && <p className="crons-error" role="alert">{error}</p>}
      <div className="cron-actions">
        <button type="button" className="btn" disabled={blocked} onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn primary"
          disabled={blocked || !draft.prompt.trim() || !draft.cwd.trim() || !draft.cron.trim()}>
          {busy ? "Saving…" : "Save cron"}
        </button>
      </div>
    </form>
  );
}
