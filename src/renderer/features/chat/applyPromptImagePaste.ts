import { insertPromptPaths } from "./insertPromptPaths";
import { pasteImageFiles } from "./pasteImageFiles";

interface Args {
  event: ClipboardEvent;
  sessionId: string;
  draft: string;
  textarea: HTMLTextAreaElement;
  onDraftChange: (text: string) => void;
  onError: (message: string) => void;
}

export async function applyPromptImagePaste({
  event,
  sessionId,
  draft,
  textarea,
  onDraftChange,
  onError,
}: Args): Promise<void> {
  const files = pasteImageFiles(event.clipboardData);
  const hasText = !!event.clipboardData?.getData("text/plain");
  if (!files.length && hasText) return;

  event.preventDefault();
  try {
    const paths: string[] = [];
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      paths.push(await window.switcheroo.savePastedImage(sessionId, {
        mimeType: file.type || "image/png",
        bytes,
      }));
    }
    if (!paths.length) {
      const saved = await window.switcheroo.saveClipboardImage(sessionId);
      if (saved) paths.push(saved);
    }
    if (!paths.length) return;
    const next = insertPromptPaths(draft, textarea.selectionStart, textarea.selectionEnd, paths);
    onDraftChange(next.value);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(next.cursor, next.cursor);
    });
  } catch (error) {
    onError(error instanceof Error ? error.message : String(error));
  }
}
