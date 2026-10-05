import type { TranscriptTurn } from "../../../shared/transcript";
import { isSameJson } from "./isSameJson";
import { shareById } from "./shareById";

/** Reuse unchanged parts of `prev` (user, assistant, events, file changes) in an IPC turn update. */
export function shareTurn<T extends TranscriptTurn>(prev: T, next: T): T {
  if (prev === next) return prev;
  const shared: T = {
    ...next,
    user: isSameJson(prev.user, next.user) ? prev.user : next.user,
    assistant: isSameJson(prev.assistant, next.assistant) ? prev.assistant : next.assistant,
    events: shareById(prev.events, next.events),
    fileChanges: isSameJson(prev.fileChanges, next.fileChanges) ? prev.fileChanges : next.fileChanges,
  };
  return isSameJson(prev, shared) ? prev : shared;
}
