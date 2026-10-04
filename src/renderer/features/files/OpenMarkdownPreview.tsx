import { useState } from "react";
import { MarkdownPreviewModal } from "./MarkdownPreviewModal";

/** Opens a GitHub-style Markdown Preview modal for an edited `.md` file. */
export function OpenMarkdownPreview({ path, text }: { path: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="file-open-button"
        data-tooltip={`Preview ${path} as on GitHub`}
        onClick={() => setOpen(true)}
      >
        Markdown Preview
      </button>
      {open ? (
        <MarkdownPreviewModal path={path} text={text} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
