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
  }>;
  transcripts: Record<string, TranscriptItem[]>;
  masterEvents: MasterEvent[];
}

export interface SwitcherooApi {
  createTab: (input: CreateTabInput) => Promise<SessionTab>;
  closeTab: (tabId: string) => Promise<void>;
  deleteTab: (tabId: string) => Promise<void>;
  renameTab: (tabId: string, title: string) => Promise<void>;
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
  getTranscript: (tabId: string) => Promise<TranscriptItem[]>;
  onTabsChanged: (cb: (payload: { tabs: SessionTab[]; activeTabId: ActiveTabId }) => void) => () => void;
  onMasterEvent: (cb: (event: MasterEvent) => void) => () => void;
  onMasterReset: (cb: (events: MasterEvent[]) => void) => () => void;
  onTranscript: (
    cb: (payload: { tabId: string; item: TranscriptItem; replaceId?: string }) => void,
  ) => () => void;
  onTranscriptReset: (cb: (payload: { tabId: string; items: TranscriptItem[] }) => void) => () => void;
  onPermission: (cb: (req: PermissionRequest) => void) => () => void;
  onAskQuestion: (cb: (req: CursorAskQuestionRequest) => void) => () => void;
  onTabStatus: (cb: (payload: { tabId: string; status: TabStatus; error: string | null }) => void) => () => void;
  onNavigateToEvent: (cb: (payload: { tabId: string; eventId: string }) => void) => () => void;
  navigateToEvent: (tabId: string, eventId: string) => Promise<void>;
}

declare global {
  interface Window {
    switcheroo: SwitcherooApi;
  }
}
