import type { RefObject } from "react";
import { usePastePrompt } from "./usePastePrompt";

const standupText = (event: Event) => (event as CustomEvent<string>).detail;

/** Insert the standup prompt built by the main process on `switcheroo:paste-standup-prompt` (menu). */
export function usePasteStandupPrompt(
  promptRef: RefObject<HTMLTextAreaElement | null>,
  onDraftChange: (text: string) => void,
): void {
  usePastePrompt("switcheroo:paste-standup-prompt", standupText, promptRef, onDraftChange);
}
