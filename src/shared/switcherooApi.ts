import type { ActiveTabId } from "./activeTabId";
import type { CursorAskQuestionRequest, PermissionRequest } from "./agentRequests";
import type { AgentKind } from "./agentKind";
import type { AppSettings } from "./appSettings";
import type { CreateSessionInput } from "./createSessionInput";
import type { FindInSessionsHit } from "./findInSessionsHit";
import type { Session, SessionStatus, SessionTab } from "./session";
import type { SwitchboardTurn } from "./switchboardTurn";
import type { TranscriptTurn } from "./transcript";

export interface SessionListPayload {
  pinned: Session[];
  unpinned: Session[];
  activeTabId: ActiveTabId;
}

export interface SwitcherooApi {
  openInCursor: (sessionId: string, filePath: string) => Promise<void>;
  /** Open the session project folder (cwd) in Cursor. */
  openSessionInCursor: (sessionId: string) => Promise<void>;
  /** Agents whose CLI and ACP adapter are installed. */
  availableAgents: () => Promise<AgentKind[]>;
  createSession: (input: CreateSessionInput) => Promise<Session>;
  forkSession: (sessionId: string, eventId?: string) => Promise<Session>;
  closeSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  pinSession: (sessionId: string) => Promise<void>;
  unpinSession: (sessionId: string) => Promise<void>;
  /** Sync Session menu Mark as Read/Unread for the active session. */
  setActiveSessionUnread: (unread: boolean) => Promise<void>;
  setActiveTab: (tabId: ActiveTabId) => Promise<void>;
  createTerminalTab: (sessionId: string) => Promise<SessionTab>;
  renameTab: (tabId: string, title: string) => Promise<void>;
  closeTab: (tabId: string) => Promise<void>;
  setTabsExpanded: (sessionId: string, expanded: boolean) => Promise<void>;
  reorderTab: (sessionId: string, tabId: string, toIndex: number) => Promise<void>;
  moveTab: (tabId: string, toSessionId: string, toIndex: number) => Promise<void>;
  /** Ensure a PTY exists for this terminal tab (lazy spawn). */
  attachTerminal: (tabId: string) => Promise<void>;
  writeTerminal: (tabId: string, data: string) => Promise<void>;
  resizeTerminal: (tabId: string, cols: number, rows: number) => Promise<void>;
  onTerminalData: (cb: (payload: { tabId: string; data: string }) => void) => () => void;
  onTerminalExit: (cb: (payload: { tabId: string }) => void) => () => void;
  listSessions: () => Promise<SessionListPayload & { switchboardTurns: SwitchboardTurn[] }>;
  sendPrompt: (sessionId: string, text: string) => Promise<void>;
  cancelPrompt: (sessionId: string) => Promise<void>;
  respondPermission: (
    requestId: string,
    optionId: string | "cancelled",
  ) => Promise<void>;
  respondAskQuestion: (
    requestId: string,
    outcome:
      | {
          outcome: "answered";
          answers: Array<{ questionId: string; selectedOptionIds: string[] }>;
        }
      | { outcome: "skipped"; reason?: string }
      | { outcome: "cancelled" },
  ) => Promise<void>;
  pickFolder: (startPath?: string) => Promise<string | null>;
  openTranscriptsFolder: () => Promise<void>;
  openSettingsFile: () => Promise<void>;
  getSettings: () => Promise<AppSettings>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  savePastedImage: (
    sessionId: string,
    image: { mimeType: string; bytes: Uint8Array },
  ) => Promise<string>;
  saveClipboardImage: (sessionId: string) => Promise<string | null>;
  /** Popup native Copy (+ Copy Message / Find / Turn Details) at the cursor. */
  showEditContextMenu: (opts?: {
    markdown?: string;
    canCopy?: boolean;
    canFind?: boolean;
    turnDetails?: { turnId: string; eventId: string };
  }) => Promise<void>;
  /** Popup Cut / Copy / Paste for the composer. */
  showComposerContextMenu: (opts?: {
    canCut?: boolean;
    canCopy?: boolean;
    canSelectAll?: boolean;
  }) => Promise<void>;
  getTranscript: (sessionId: string) => Promise<TranscriptTurn[]>;
  findInSessions: (query: string, searchId: number) => Promise<{ searchId: number }>;
  stopFindInSessions: () => Promise<void>;
  onFindProgress: (
    cb: (payload: {
      searchId: number;
      scanned: number;
      total: number;
      matchCount: number;
    }) => void,
  ) => () => void;
  onFindChunk: (
    cb: (payload: { searchId: number; added: FindInSessionsHit[] }) => void,
  ) => () => void;
  onFindDone: (
    cb: (payload: { searchId: number; stopped: boolean }) => void,
  ) => () => void;
  onSessionsChanged: (cb: (payload: SessionListPayload) => void) => () => void;
  onSwitchboardTurn: (cb: (turn: SwitchboardTurn) => void) => () => void;
  onSwitchboardTurns: (cb: (turns: SwitchboardTurn[]) => void) => () => void;
  onSwitchboardSessionRemoved: (
    cb: (payload: { sessionId: string; message: string }) => void,
  ) => () => void;
  onTranscript: (
    cb: (payload: { sessionId: string; turn: TranscriptTurn }) => void,
  ) => () => void;
  /** `draft` seeds the composer (fork on a user message). */
  onTranscriptReset: (
    cb: (payload: { sessionId: string; turns: TranscriptTurn[]; draft?: string }) => void,
  ) => () => void;
  onPermission: (cb: (req: PermissionRequest) => void) => () => void;
  onQuestionSettled: (cb: (payload: { requestId: string }) => void) => () => void;
  onAskQuestion: (cb: (req: CursorAskQuestionRequest) => void) => () => void;
  onPromptComplete: (cb: (payload: { sessionId: string }) => void) => () => void;
  onSessionStatus: (cb: (payload: { sessionId: string; status: SessionStatus; error: string | null }) => void) => () => void;
  onNavigateToEvent: (cb: (payload: { sessionId: string; turnId: string; eventId: string }) => void) => () => void;
  navigateToEvent: (sessionId: string, turnId: string, eventId: string) => Promise<void>;
}

declare global {
  interface Window {
    switcheroo: SwitcherooApi;
  }
}
