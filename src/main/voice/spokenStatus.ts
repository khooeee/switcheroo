import type { SessionStatus } from "../../shared/session";

/** Session status in the words the voice agent should use. */
export function spokenStatus(status: SessionStatus): string {
  switch (status) {
    case "running":
      return "working";
    case "connecting":
      return "starting";
    case "error":
      return "error";
    default:
      return "idle";
  }
}
