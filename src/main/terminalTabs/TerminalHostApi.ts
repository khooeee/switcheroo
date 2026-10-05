import type { Session } from "../../shared/session";
import type { TerminalHost } from "../terminalHost";

/** Session state that tab operations read and mutate. */
export type TerminalHostApi = {
  sessions: Map<string, Session>;
  terminals: TerminalHost;
  getActiveTabId: () => string;
  setActiveTabId: (id: string) => void;
  emitSessions: () => void;
  persist: () => void;
  refreshCommandsIfNeeded: (sessionId: string) => void;
};
