import { CheckIcon } from "./CheckIcon";
import { useFlash } from "./useFlash";
import "./eventActionButton.css";

/** Opens a save dialog and writes markdown to a `.md` file. `text` may be a function so callers build it only on click. */
export function SaveMarkdownButton({
  text,
  nameHint,
  label = "Save Message as Markdown",
}: {
  text: string | (() => string);
  /** Default file name source; the text's first line when omitted. */
  nameHint?: string;
  /** Tooltip at rest; headers that save a whole transcript pass their own. */
  label?: string;
}) {
  // No "saving" state: the dialog is window-modal, so the button cannot be clicked again meanwhile.
  const [result, flash] = useFlash<"saved" | "error">();
  const tooltip = result === "saved" ? "Saved" : result === "error" ? "Save failed" : label;

  return (
    <button
      type="button"
      className={`event-action${result === "saved" ? " copied" : ""}${result === "error" ? " error" : ""}`}
      aria-label={tooltip}
      data-tooltip={tooltip}
      data-tooltip-align="center"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void window.switcheroo.saveMarkdown(typeof text === "function" ? text() : text, nameHint)
          .then((saved) => {
            if (saved) flash("saved");
          })
          .catch((err) => {
            console.error(err);
            flash("error");
          });
      }}
    >
      {result === "saved" ? <CheckIcon /> : <SaveIcon />}
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
