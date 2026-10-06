import { CheckIcon } from "./CheckIcon";
import { CopyIcon } from "./CopyIcon";
import { useCopiedFlash } from "./useCopiedFlash";
import "./eventActionButton.css";

/** Right-aligned icon that copies message text; shows an instant Copy as Markdown tooltip on hover. */
export function CopyEventButton({ text }: { text: string }) {
  const [copied, copy] = useCopiedFlash();
  const label = copied ? "Copied" : "Copy as Markdown";

  return (
    <button
      type="button"
      className={`event-action${copied ? " copied" : ""}`}
      aria-label={label}
      data-tooltip={label}
      data-tooltip-align="center"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        copy(text);
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}
