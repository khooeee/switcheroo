import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "./CheckIcon";
import "./eventActionButton.css";

type SaveState = "idle" | "saving" | "saved" | "error";

const LABELS: Record<Exclude<SaveState, "idle">, string> = {
  saving: "Saving…",
  saved: "Saved",
  error: "Save failed",
};

/** Opens a save dialog and writes markdown to a `.md` file. `text` may be a function so callers build it only on click. */
export function SaveMarkdownButton({
  text,
  nameHint,
  label: idleLabel = "Save Message as Markdown",
}: {
  text: string | (() => string);
  /** Default file name source; the text's first line when omitted. */
  nameHint?: string;
  /** Tooltip at rest; headers that save a whole transcript pass their own. */
  label?: string;
}) {
  const [state, setState] = useState<SaveState>("idle");
  const resetTimer = useRef<number | null>(null);
  const label = state === "idle" ? idleLabel : LABELS[state];

  useEffect(() => () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
  }, []);

  const flash = (next: SaveState) => {
    setState(next);
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setState("idle"), 1500);
  };

  return (
    <button
      type="button"
      className={`event-action${state === "saved" ? " copied" : ""}${state === "error" ? " error" : ""}`}
      aria-label={label}
      data-tooltip={label}
      data-tooltip-align="center"
      disabled={state === "saving"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setState("saving");
        void window.switcheroo.saveMarkdown(typeof text === "function" ? text() : text, nameHint)
          .then((saved) => (saved ? flash("saved") : setState("idle")))
          .catch((err) => {
            console.error(err);
            flash("error");
          });
      }}
    >
      {state === "saved" ? <CheckIcon /> : <SaveIcon />}
    </button>
  );
}

function SaveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}
