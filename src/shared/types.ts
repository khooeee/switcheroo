export type AgentKind = "claude" | "codex" | "cursor";

export const MASTER_TAB_ID = "master" as const;

export type ActiveTabId = typeof MASTER_TAB_ID | string;

export type TabStatus = "idle" | "connecting" | "ready" | "running" | "error";

export type MasterEventKind =
  | "message"
  | "tool"
  | "permission"
  | "plan"
  | "error"
  | "status"
  | "stopped"
  | "user";

export interface MasterEvent {
  id: string;
  tabId: string;
  agentKind: AgentKind;
  at: number;
  kind: MasterEventKind;
  summary: string;
  fileChanges?: FileChange[];
  toolStatus?: string;
  /** True when the source tab still exists */
  navigable: boolean;
}

export interface SessionTab {
  id: string;
  title: string;
  agentKind: AgentKind;
  cwd: string;
  sessionId: string | null;
  status: TabStatus;
  supportsSteering?: boolean;
  error: string | null;
  createdAt: number;
  /** Hidden from the rail. The session and its Switchboard events stay. */
  closed: boolean;
  notes?: string;
  notesWidth?: number;
}

export type TranscriptRole = "user" | "assistant" | "thought" | "tool" | "system" | "stopped";

export interface TranscriptItem {
  id: string;
  role: TranscriptRole;
  text: string;
  at: number;
  toolCallId?: string;
  toolStatus?: string;
  toolTitle?: string;
  diffs?: DiffPayload[];
  fileChanges?: FileChange[];
}

export interface FileChange extends DiffPayload {
  kind: "created" | "updated" | "deleted" | "moved";
}

export interface DiffPayload {
  path: string;
  oldText?: string | null;
  newText?: string | null;
}

export interface PermissionRequest {
  requestId: string;
  tabId: string;
  toolCallTitle: string;
  options: Array<{ optionId: string; name: string; kind: string }>;
}

export interface CursorAskQuestionRequest {
  requestId: string;
  tabId: string;
  toolCallId: string;
  title?: string;
  questions: Array<{
    id: string;
    prompt: string;
    options: Array<{ id: string; label: string }>;
    allowMultiple?: boolean;
  }>;
}

export interface CreateTabInput {
  agentKind: AgentKind;
  cwd: string;
  title?: string;
}

export interface PersistedState {
  version: 1;
  activeTabId: ActiveTabId;
  tabs: Array<{
    id: string;
    title: string;
    agentKind: AgentKind;
    cwd: string;
    sessionId: string | null;
    closed?: boolean;
    notes?: string;
    notesWidth?: number;
  }>;
  transcripts: Record<string, TranscriptItem[]>;
  masterEvents: MasterEvent[];
}

export interface SwitcherooApi {
  openInCursor: (tabId: string, filePath: string) => Promise<void>;
  createTab: (input: CreateTabInput) => Promise<SessionTab>;
  forkTab: (tabId: string, eventId: string) => Promise<SessionTab>;
  closeTab: (tabId: string) => Promise<void>;
  deleteTab: (tabId: string) => Promise<void>;
  renameTab: (tabId: string, title: string) => Promise<void>;
  setTabNotes: (tabId: string, notes: string) => Promise<void>;
  setTabNotesWidth: (tabId: string, width: number) => Promise<void>;
  reorderTabs: (tabIds: string[]) => Promise<void>;
  setActiveTab: (tabId: ActiveTabId) => Promise<void>;
  listTabs: () => Promise<{
    tabs: SessionTab[];
    activeTabId: ActiveTabId;
    masterEvents: MasterEvent[];
  }>;
  sendPrompt: (tabId: string, text: string) => Promise<void>;
  cancelPrompt: (tabId: string) => Promise<void>;
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
  pickFolder: () => Promise<string | null>;
  savePastedImage: (
    tabId: string,
    image: { mimeType: string; bytes: Uint8Array },
  ) => Promise<string>;
  saveClipboardImage: (tabId: string) => Promise<string | null>;
  getTranscript: (tabId: string) => Promise<TranscriptItem[]>;
  onTabsChanged: (cb: (payload: { tabs: SessionTab[]; activeTabId: ActiveTabId }) => void) => () => void;
  onMasterEvent: (cb: (event: MasterEvent) => void) => () => void;
  onMasterReset: (cb: (events: MasterEvent[]) => void) => () => void;
  onTranscript: (
    cb: (payload: { tabId: string; item: TranscriptItem; replaceId?: string }) => void,
  ) => () => void;
  onTranscriptReset: (cb: (payload: { tabId: string; items: TranscriptItem[] }) => void) => () => void;
  onPermission: (cb: (req: PermissionRequest) => void) => () => void;
  onQuestionSettled: (cb: (payload: { requestId: string }) => void) => () => void;
  onAskQuestion: (cb: (req: CursorAskQuestionRequest) => void) => () => void;
  onPromptComplete: (cb: (payload: { tabId: string }) => void) => () => void;
  onTabStatus: (cb: (payload: { tabId: string; status: TabStatus; error: string | null }) => void) => () => void;
  onNavigateToEvent: (cb: (payload: { tabId: string; eventId: string }) => void) => () => void;
  navigateToEvent: (tabId: string, eventId: string) => Promise<void>;
}

declare global {
  interface Window {
    switcheroo: SwitcherooApi;
  }
}
