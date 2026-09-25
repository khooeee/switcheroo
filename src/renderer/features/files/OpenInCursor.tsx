import { useState } from "react";

export function OpenInCursor({ tabId, filePath }: { tabId: string; filePath: string }) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="file-open">
      <button
        type="button"
        className="file-open-button"
        data-tooltip={`Open ${filePath} in Cursor`}
        disabled={opening}
        onClick={() => {
          setOpening(true);
          setError(null);
          void window.switcheroo.openInCursor(tabId, filePath)
            .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)))
            .finally(() => setOpening(false));
        }}
      >
        {opening ? "Opening…" : "Open in Cursor"}
      </button>
      {error && <span className="file-open-error" role="alert">{error}</span>}
    </div>
  );
}
