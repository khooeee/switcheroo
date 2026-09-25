import { useState } from "react";
import "./eventActionButton.css";

/** Fork icon control for agent transcripts; creates a session branched at this event. */
export function ForkEventButton({ tabId, eventId }: { tabId: string; eventId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const label = error ? "Fork failed" : busy ? "Forking…" : "Fork";

  return (
    <button
      type="button"
      className={`event-action${error ? " error" : ""}`}
      aria-label={label}
      data-tooltip={label}
      data-tooltip-align="end"
      disabled={busy}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setBusy(true);
        setError(false);
        void window.switcheroo.forkTab(tabId, eventId)
          .catch((err) => {
            console.error(err);
            setError(true);
            window.setTimeout(() => setError(false), 2000);
          })
          .finally(() => setBusy(false));
      }}
    >
      <ForkIcon />
    </button>
  );
}

function ForkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="12" cy="18" r="2" />
      <path d="M6 8v2a4 4 0 0 0 4 4h0a4 4 0 0 0 4-4V8" />
      <path d="M12 14v2" />
    </svg>
  );
}
