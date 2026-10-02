export type AgentKind = "claude" | "codex" | "cursor" | "pi";

const AGENT_KINDS = new Set<AgentKind>(["claude", "codex", "cursor", "pi"]);

export function isAgentKind(value: unknown): value is AgentKind {
  return typeof value === "string" && AGENT_KINDS.has(value as AgentKind);
}

export const SWITCHBOARD_ID = "switchboard" as const;

export type ActiveSessionId = typeof SWITCHBOARD_ID | string;

export type SessionStatus = "idle" | "connecting" | "ready" | "running" | "error";

export type TurnStatus = "running" | "complete" | "stopped";

/** One user prompt and the session updates that followed it. */
export interface TranscriptTurn {
  id: string;
  /** User message time — used for Switchboard / find sort order. */
  at: number;
  user: TranscriptItem;
  /** Latest assistant message; prior assistants live in `events`. */
  assistant: TranscriptItem | null;
  events: TranscriptItem[];
  /** Aggregated from tool events in this turn. */
  fileChanges: FileChange[];
  status: TurnStatus;
}

/** A session turn mirrored into the Switchboard feed. */
export interface SwitchboardTurn extends TranscriptTurn {
  sessionId: string;
  /** Session title at event time (kept after soft-close) */
  sessionTitle?: string;
  agent: AgentKind;
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
  agent: AgentKind;
  cwd: string;
  /** ACP agent session id (not the Switcheroo session folder id). */
  agentSessionId: string | null;
  status: SessionStatus;
  supportsSteering?: boolean;
  /** Agent supports ACP `session/fork` (assumed until an agent of this kind connects). */
  supportsFork?: boolean;
  /** Fork can drop agent history after a transcript message, not just copy all of it. */
  supportsForkAtMessage?: boolean;
  error: string | null;
  createdAt: number;
  /** ACP slash commands advertised by the agent for this session. */
  slashCommands?: SlashCommand[];
  /** Context window usage from ACP usage_update (persisted in session meta). */
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
  /** Waiting behind an in-flight prompt (not yet sent to the agent). */
  queued?: boolean;
  toolCallId?: string;
  toolStatus?: string;
  toolTitle?: string;
  fileChanges?: FileChange[];
}

/** One transcript hit from Find in History (Cmd+Shift+F). */
export interface FindInSessionsHit {
  sessionId: string;
  turnId: string;
  eventId: string;
  title: string;
  agent: AgentKind;
  role: TranscriptRole;
  snippet: string;
  at: number;
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
  agent: AgentKind;
  cwd: string;
  title?: string;
  /** When true, send a visible bootstrap prompt about the control API after the session is ready. */
  switcherooAware?: boolean;
  /** When true, add the session to the top of the pinned rail section. */
  pin?: boolean;
}

export type Theme = "light" | "dark";

/** UI preferences persisted in switcheroo.json. */
export interface AppSettings {
  theme: Theme;
  zenMode: boolean;
  soundEnabled: boolean;
  railWidth: number;
  composerHeight: number;
  lastAgent: AgentKind;
  lastCwd: string;
  lastPrefix: string;
  lastPin: boolean;
  lastSwitcherooAware: boolean;
  /** Drop Switchboard turns older than this many days on startup. */
  cleanSwitchboardTurnsOlderThanDays: number;
  /** Soft-close oldest rail sessions on startup when over this (0 = unlimited). */
  sessionListMax: number;
}

export function defaultAppSettings(): AppSettings {
  return {
    theme: "dark",
    zenMode: true,
    soundEnabled: true,
    railWidth: 160,
    composerHeight: 72,
    lastAgent: "claude",
    lastCwd: "",
    lastPrefix: "",
    lastPin: false,
    lastSwitcherooAware: false,
    cleanSwitchboardTurnsOlderThanDays: 30,
    sessionListMax: 200,
  };
}

export function mergeAppSettings(partial?: Partial<AppSettings> | null): AppSettings {
  return { ...defaultAppSettings(), ...partial };
}

export interface PersistedState {
  version: 1;
  activeSessionId: ActiveSessionId;
  settings?: AppSettings;
  /** Pinned session ids in rail order (top section). */
  pinned: string[];
  /** Unpinned session ids in rail order (below pinned). */
  unpinned: string[];
}

export interface SessionListPayload {
  pinned: Session[];
  unpinned: Session[];
  activeSessionId: ActiveSessionId;
}

export interface SwitcherooApi {
  openInCursor: (sessionId: string, filePath: string) => Promise<void>;
  /** Agents whose CLI and ACP adapter are installed. */
  availableAgents: () => Promise<AgentKind[]>;
  createSession: (input: CreateSessionInput) => Promise<Session>;
  forkSession: (sessionId: string, eventId?: string) => Promise<Session>;
  closeSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  reorderPinnedSessions: (sessionIds: string[]) => Promise<void>;
  pinSession: (sessionId: string) => Promise<void>;
  unpinSession: (sessionId: string) => Promise<void>;
  setActiveSession: (sessionId: ActiveSessionId) => Promise<void>;
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
  pickFolder: () => Promise<string | null>;
  openTranscriptsFolder: () => Promise<void>;
  openSettingsFile: () => Promise<void>;
  getSettings: () => Promise<AppSettings>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  savePastedImage: (
    sessionId: string,
    image: { mimeType: string; bytes: Uint8Array },
  ) => Promise<string>;
  saveClipboardImage: (sessionId: string) => Promise<string | null>;
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
  onTranscriptReset: (cb: (payload: { sessionId: string; turns: TranscriptTurn[] }) => void) => () => void;
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
