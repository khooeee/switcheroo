import "./eventActionButton.css";

/** Opens / toggles turn details (right rail) for a transcript message. */
export function TurnDetailsButton({ onToggle }: { onToggle: () => void }) {
  return (
    <button
      type="button"
      className="event-action"
      aria-label="Turn Details"
      data-tooltip="Turn Details"
      data-tooltip-align="center"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
    >
      <ChevronRightIcon />
    </button>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
