import type { Session } from "../../shared/session";
import type { SessionListPayload } from "../../shared/switcherooApi";

function slim({ slashCommands: _commands, ...session }: Session): Session {
  return session;
}

/** The rail without per-session slash commands, which dominate the payload. */
export function remoteSessionList(list: SessionListPayload): SessionListPayload {
  return { ...list, pinned: list.pinned.map(slim), unpinned: list.unpinned.map(slim) };
}
