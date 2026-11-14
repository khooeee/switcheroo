import { useEffect, useRef, useState } from "react";
import { AGENT_LABELS } from "../../../shared/agentLabels";
import type { CronInput } from "../../../shared/cronInput";
import type { CronsSnapshot } from "../../../shared/cronsSnapshot";
import { errorMessage } from "../../../shared/errorMessage";
import { trapModalTabFocus } from "../modals/trapModalTabFocus";
import { CronForm } from "./CronForm";
import "../modals/modal.css";
import "./crons.css";

export function CronsModal({ onClose }: { onClose: () => void }) {
  const [snapshot, setSnapshot] = useState<CronsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // -1 creates a cron; null shows the list.
  const [editing, setEditing] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const blocked = busy || !snapshot || snapshot.errors.length > 0;

  useEffect(() => {
    let stopped = false;
    window.switcheroo.getCrons().then((result) => {
      if (!stopped) setSnapshot(result);
    }).catch((err) => {
      if (!stopped) setError(errorMessage(err));
    });
    return () => { stopped = true; };
  }, []);

  const cancelEdit = () => {
    setEditing(null);
    setError(null);
    requestAnimationFrame(() => addRef.current?.focus());
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!busy) {
          if (editing !== null) cancelEdit();
          else onClose();
        }
      }
      if (dialogRef.current) trapModalTabFocus(event, dialogRef.current);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, busy, editing]);

  const save = async (crons: CronInput[]) => {
    if (blocked || !snapshot) return;
    setBusy(true);
    setError(null);
    try {
      setSnapshot(await window.switcheroo.saveCrons(crons, snapshot.revision));
      cancelEdit();
    } catch (err) {
      setError(errorMessage(err).replace(/^Error invoking remote method '[^']+': (Error: )?/, ""));
    } finally {
      setBusy(false);
    }
  };
  const saveEntry = (entry: CronInput) => {
    const crons = snapshot?.crons ?? [];
    return save(editing === -1 ? [...crons, entry] : crons.map((cron, i) => i === editing ? entry : cron));
  };

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div ref={dialogRef} className="modal crons-modal" role="dialog" aria-modal="true"
        aria-labelledby="crons-title" onClick={(event) => event.stopPropagation()}>
        <div className="crons-header">
          <h2 id="crons-title">Crons</h2>
          <button autoFocus type="button" className="btn" disabled={busy} onClick={onClose}>Close</button>
        </div>
        <p className="crons-hint">Each enabled cron starts a new background session. Runs only while Switcheroo is open; missed runs are skipped.</p>
        <div className="crons-body">
          {snapshot?.errors.length ? <div className="crons-error" role="alert">{snapshot.errors.join("; ")}</div> : null}
          {error && <div className="crons-error" role="alert">{error}</div>}
          {!snapshot && !error && <p>Loading crons…</p>}
          {editing !== null ? (
            <CronForm key={editing} cron={snapshot?.crons[editing] ?? null} busy={blocked}
              onSave={saveEntry} onCancel={cancelEdit} />
          ) : (
            <>
              {snapshot && !snapshot.errors.length && !snapshot.crons.length && <p className="crons-hint">No crons yet.</p>}
              <ul className="crons-list">
                {snapshot?.crons.map((cron, index) => (
                  <li key={index} className="cron-row">
                    <div className="cron-details">
                      <h3>{cron.title || "Untitled cron"}</h3>
                      <p className="cron-summary"><code>{cron.cron}</code> · {AGENT_LABELS[cron.agent]} · {cron.enabled === true ? "Enabled" : "Disabled"}</p>
                      <p className="cron-path">{cron.cwd}</p>
                      <p className="cron-prompt">{cron.prompt}</p>
                    </div>
                    <div className="cron-actions">
                      <button type="button" className="btn" disabled={blocked} onClick={() => {
                        setError(null);
                        setEditing(index);
                      }}>Edit</button>
                      <button type="button" className="btn" disabled={blocked} onClick={() => void save(
                        snapshot.crons.map((entry, i) => i === index ? { ...entry, enabled: entry.enabled !== true } : entry),
                      )}>{cron.enabled === true ? "Disable" : "Enable"}</button>
                      <button type="button" className="btn" disabled={blocked}
                        aria-label={`Delete cron: ${cron.title || cron.cron}`}
                        onClick={() => void save(snapshot.crons.filter((_, i) => i !== index))}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
              <button ref={addRef} type="button" className="btn primary" disabled={blocked} onClick={() => {
                setError(null);
                setEditing(-1);
              }}>Add cron</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
