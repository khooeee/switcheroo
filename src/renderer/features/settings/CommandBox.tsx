import { useCopiedFlash } from "../copy/useCopiedFlash";

/** A terminal command in a bordered box, with its Copy button inside on the right. */
export function CommandBox({ command }: { command: string }) {
  const [copied, copy] = useCopiedFlash();
  return (
    <div className="command-box">
      <code>{command}</code>
      <button type="button" className="btn" onClick={() => copy(command)}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
