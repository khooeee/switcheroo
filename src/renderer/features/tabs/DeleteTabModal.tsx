import { useEffect, useRef, useState } from "react";
import type { SessionTab } from "../../../shared/types";
import "./deleteTabModal.css";

export function DeleteTabModal({ tab, onCancel, onDelete }: {
  tab: SessionTab;
  onCancel: () => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleting = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.showModal();
    cancelRef.current?.focus();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);

  const remove = async () => {
    if (deleting.current) return;
    deleting.current = true;
    setBusy(true);
    setError(null);
    try {
      await onDelete(tab.id);
      onCancel();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      deleting.current = false;
      setBusy(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="modal delete-tab-modal" aria-labelledby="delete-tab-title"
      aria-describedby="delete-tab-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!deleting.current) onCancel();
      }}
      onKeyDown={(event) => event.stopPropagation()}>
      <h3 id="delete-tab-title">Delete “{tab.title}”?</h3>
      <p id="delete-tab-description">
        This permanently removes the session, its messages, and notes.
        {tab.status === "running" || tab.status === "connecting" ? " The agent will be stopped." : ""}
        {" "}This cannot be undone.
      </p>
      {error && <p role="alert" className="delete-tab-error">{error}</p>}
      <div className="composer-actions" style={{ justifyContent: "flex-end" }}>
        <button ref={cancelRef} type="button" className="btn" disabled={busy} onClick={onCancel}>Cancel</button>
        <button type="button" className="btn delete-tab-confirm" disabled={busy} onClick={() => void remove()}>
          {busy ? "Deleting…" : "Delete"}
        </button>
      </div>
    </dialog>
  );
}
