import "./sessionNotice.css";

interface Props {
  message: string;
  onDismiss: () => void;
}

/** Dismissible alert above the main panel, e.g. for a session gone from disk. */
export function SessionNotice({ message, onDismiss }: Props) {
  return (
    <div className="session-notice" role="alert">
      <span>{message}</span>
      <button type="button" className="btn" aria-label="Dismiss" onClick={onDismiss}>
        ✕
      </button>
    </div>
  );
}
