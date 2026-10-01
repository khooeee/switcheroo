interface Props {
  message: string;
  onDismiss: () => void;
}

/** Inline Switchboard alert for missing-session cleanup. */
export function SwitchboardNotice({ message, onDismiss }: Props) {
  return (
    <div className="switchboard-notice" role="alert">
      <span>{message}</span>
      <button type="button" className="btn" aria-label="Dismiss" onClick={onDismiss}>
        ✕
      </button>
    </div>
  );
}
