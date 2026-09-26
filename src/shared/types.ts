export type AgentKind = "claude" | "codex" | "cursor" | "pi";

const AGENT_KINDS = new Set<AgentKind>(["claude", "codex", "cursor", "pi"]);

export function isAgentKind(value: unknown): value is AgentKind {
  return typeof value === "string" && AGENT_KINDS.has(value as AgentKind);
}

export const SWITCHBOARD_ID = "master" as const;

export type ActiveSessionId = typeof SWITCHBOARD_ID | string;

export type SessionStatus = "idle" | "connecting" | "ready" | "running" | "error";

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
  sessionId: string;
  /** Session title at event time (kept after soft-close) */
  sessionTitle?: string;
  agentKind: AgentKind;
  at: number;
  kind: MasterEventKind;
  summary: string;
  fileChanges?: FileChange[];
  toolStatus?: string;
  /** True when the session folder still exists and can be reopened */
  navigable: boolean;
}

export interface SessionUsage {
  used: number;
  size: number;
  cost?: { amount: number; currency: string };
}

export interface Session {
  id: string;
  title: string;
  agentKind: AgentKind;
  cwd: string;
  /** ACP agent session id (not the Switcheroo session folder id). */
  agentSessionId: string | null;
  status: SessionStatus;
  supportsSteering?: boolean;
  error: string | null;
  createdAt: number;
  notes?: string;
  notesWidth?: number;
  /** ACP slash commands advertised by the agent for this session. */
  slashCommands?: SlashCommand[];
  /** Live context window usage from ACP usage_update; not persisted. */
  usage?: SessionUsage;
}

export interface SlashCommand {
  name: string;
  description: string;
  hint?: string;
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
  sessionId: string;
  toolCallTitle: string;
  options: Array<{ optionId: string; name: string; kind: string }>;
}

export interface CursorAskQuestionRequest {
  requestId: string;
  sessionId: string;
  toolCallId: string;
  title?: string;
  questions: Array<{
    id: string;
    prompt: string;
    options: Array<{ id: string; label: string }>;
    allowMultiple?: boolean;
  }>;
}

export interface CreateSessionInput {
  agentKind: AgentKind;
  cwd: string;
  title?: string;
  /** When true, send a visible bootstrap prompt about the control API after the session is ready. */
  switcherooAware?: boolean;
}

export interface PersistedSession {
  id: string;
  title: string;
}

export interface PersistedState {
  version: 1;
  activeSessionId: ActiveSessionId;
  /** Open sessions in rail order. Soft-closed sessions are omitted but kept on disk. */
  sessions: PersistedSession[];
}

export interface SwitcherooApi {
  openInCursor: (sessionId: string, filePath: string) => Promise<void>;
  createSession: (input: CreateSessionInput) => Promise<Session>;
  forkSession: (sessionId: string, eventId?: string) => Promise<Session>;
  closeSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  setSessionNotes: (sessionId: string, notes: string) => Promise<void>;
  setSessionNotesWidth: (sessionId: string, width: number) => Promise<void>;
  reorderSessions: (sessionIds: string[]) => Promise<void>;
  setActiveSession: (sessionId: ActiveSessionId) => Promise<void>;
  listSessions: () => Promise<{
    sessions: Session[];
    activeSessionId: ActiveSessionId;
    masterEvents: MasterEvent[];
  }>;
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
  pickFolder: () => Promise<string | null>;
  savePastedImage: (
    sessionId: string,
    image: { mimeType: string; bytes: Uint8Array },
  ) => Promise<string>;
  saveClipboardImage: (sessionId: string) => Promise<string | null>;
  getTranscript: (sessionId: string) => Promise<TranscriptItem[]>;
  onSessionsChanged: (cb: (payload: { sessions: Session[]; activeSessionId: ActiveSessionId }) => void) => () => void;
  onMasterEvent: (cb: (event: MasterEvent) => void) => () => void;
  onTranscript: (
    cb: (payload: { sessionId: string; item: TranscriptItem; replaceId?: string }) => void,
  ) => () => void;
  onTranscriptReset: (cb: (payload: { sessionId: string; items: TranscriptItem[] }) => void) => () => void;
  onPermission: (cb: (req: PermissionRequest) => void) => () => void;
  onQuestionSettled: (cb: (payload: { requestId: string }) => void) => () => void;
  onAskQuestion: (cb: (req: CursorAskQuestionRequest) => void) => () => void;
  onPromptComplete: (cb: (payload: { sessionId: string }) => void) => () => void;
  onSessionStatus: (cb: (payload: { sessionId: string; status: SessionStatus; error: string | null }) => void) => () => void;
  onNavigateToEvent: (cb: (payload: { sessionId: string; eventId: string }) => void) => () => void;
  navigateToEvent: (sessionId: string, eventId: string) => Promise<void>;
}

declare global {
  interface Window {
    switcheroo: SwitcherooApi;
  }
}
