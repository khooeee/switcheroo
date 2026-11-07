import type { RefObject } from "react";
import { controlBootstrapText } from "../../../shared/controlBootstrapText";
import { usePastePrompt } from "./usePastePrompt";

/** Insert the control API bootstrap prompt on `switcheroo:paste-aware-prompt` (menu). */
export function usePasteAwarePrompt(
  sessionId: string,
  promptRef: RefObject<HTMLTextAreaElement | null>,
  onDraftChange: (text: string) => void,
): void {
  usePastePrompt(
    "switcheroo:paste-aware-prompt",
    () => controlBootstrapText(sessionId),
    promptRef,
    onDraftChange,
  );
}
