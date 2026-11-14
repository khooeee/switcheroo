import type { ActiveTabId } from "./activeTabId";
import type { CursorAskQuestionRequest } from "./agentRequests";
import type { AgentKind } from "./agentKind";
import type { AppSettings } from "./appSettings";
import type { ConfigMenuCategory } from "./configMenuCategory";
import type { CreateSessionInput } from "./createSessionInput";
import type { DirEntry } from "./dirEntry";
import type { FindInSessionsHit } from "./findInSessionsHit";
import type { RemoteStatus } from "./remoteStatus";
import type { EditContextMenuOptions } from "./editContextMenuOptions";
import type { FileContent } from "./fileContent";
import type { FileWriteResult } from "./fileWriteResult";
import type { PersistedExplorer } from "./persistedExplorer";
import type { Session } from "./session";
import type { TranscriptTurn } from "./transcript";
import type { UnsavedChoice } from "./unsavedChoice";
import type { VoiceCommand } from "./voiceCommand";
import type { VoiceConnectionEvent } from "./voiceConnectionEvent";
import type { VoiceKeyInfo } from "./voiceKeyInfo";
import type { VoiceLogEntry } from "./voiceLogEntry";
import type { VoiceStatus } from "./voiceStatus";

export interface SessionListPayload {
  pinned: Session[];
  unpinned: Session[];
  activeTabId: ActiveTabId;
}

export interface SwitcherooApi {
  /** Agents whose CLI and ACP adapter are installed. */
  availableAgents: () => Promise<AgentKind[]>;
  createSession: (input: CreateSessionInput) => Promise<Session>;
  forkSession: (sessionId: string, eventId?: string) => Promise<Session>;
  closeSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  pinSession: (sessionId: string) => Promise<void>;
  unpinSession: (sessionId: string) => Promise<void>;
  setActiveTab: (tabId: string) => Promise<void>;
  listSessions: () => Promise<SessionListPayload>;
  sendPrompt: (sessionId: string, text: string) => Promise<void>;
  cancelPrompt: (sessionId: string) => Promise<void>;
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
  /** Save-as dialog that writes `text` to a `.md` file named from `nameHint` (else `text`); false when cancelled. */
  saveMarkdown: (text: string, nameHint?: string) => Promise<boolean>;
  openTranscriptsFolder: () => Promise<void>;
  openCronsFile: () => Promise<void>;
  openRemindersFile: () => Promise<void>;
  getSettings: () => Promise<AppSettings>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  /** iOS remote access: the pairing link and `tailscale serve` setup. */
  getRemoteStatus: () => Promise<RemoteStatus>;
  /** New token for the iOS app (control.json scripts keep theirs); returns the status with the new link. */
  rotateControlToken: () => Promise<RemoteStatus>;
  savePastedImage: (
    sessionId: string,
    image: { mimeType: string; bytes: Uint8Array },
  ) => Promise<string>;
  saveClipboardImage: (sessionId: string) => Promise<string | null>;
  /** Popup native Copy (+ Copy Link / Copy Code / Copy Message / Save Message as Markdown / Find / Turn Details / Save <view> as Markdown) at the cursor. */
  showEditContextMenu: (opts?: EditContextMenuOptions) => Promise<void>;
  /** Native Save Image menu for a stored transcript image. */
  showImageContextMenu: (name: string) => Promise<void>;
  /** Popup Cut / Copy / Paste for the composer. */
  showComposerContextMenu: (opts?: {
    canCut?: boolean;
    canCopy?: boolean;
    canSelectAll?: boolean;
  }) => Promise<void>;
  /** Popup the session's model or effort picker; choosing a value sets it on the agent. */
  showConfigMenu: (sessionId: string, category: ConfigMenuCategory) => Promise<void>;
  /** Children of a folder under the session cwd ("" is the root). */
  listSessionDir: (sessionId: string, relPath: string) => Promise<DirEntry[]>;
  /** Files under the session cwd for Go to File: git's tracked and unignored files in a repo, else a capped folder walk. */
  listSessionFiles: (sessionId: string) => Promise<string[]>;
  /** Native Open File dialog; returns a project-relative or external absolute path, null when cancelled. */
  pickSessionFile: (sessionId: string) => Promise<string | null>;
  /** Editor paths are project-relative, or absolute for files opened outside the project. */
  readSessionFile: (sessionId: string, relPath: string) => Promise<FileContent>;
  /** Save editor text; `baseMtimeMs` null overwrites even when the file changed on disk. */
  writeSessionFile: (
    sessionId: string,
    relPath: string,
    text: string,
    baseMtimeMs: number | null,
  ) => Promise<FileWriteResult>;
  /** Native Save / Don't Save / Cancel for files with unsaved edits. */
  confirmUnsavedChanges: (names: string[]) => Promise<UnsavedChoice>;
  /** Watch the session cwd while its explorer is shown; changes arrive on `onSessionFilesChanged`. */
  watchSessionFiles: (sessionId: string) => Promise<void>;
  unwatchSessionFiles: (sessionId: string) => Promise<void>;
  /** Relative paths that changed under a watched session; null means too many to list. */
  onSessionFilesChanged: (cb: (payload: { sessionId: string; paths: string[] | null }) => void) => () => void;
  /** The session's saved file explorer (tree, tabs, scroll), or null for a fresh one. */
  getExplorerState: (sessionId: string) => Promise<PersistedExplorer | null>;
  saveExplorerState: (sessionId: string, state: PersistedExplorer) => Promise<void>;
  /** Main is about to quit: settle unsaved files, then answer with `quitReady` (false cancels). */
  onPrepareQuit: (cb: (payload: { requestId: number }) => void) => () => void;
  quitReady: (requestId: number, ok: boolean) => void;
  getTranscript: (sessionId: string) => Promise<TranscriptTurn[]>;
  getSubagentTranscript: (sessionId: string, subagentId: string) => Promise<TranscriptTurn[]>;
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
  onSessionRemoved: (cb: (payload: { message: string }) => void) => () => void;
  onTranscript: (
    cb: (payload: { sessionId: string; turn: TranscriptTurn }) => void,
  ) => () => void;
  onSubagentTurn: (
    cb: (payload: { sessionId: string; subagentId: string; turn: TranscriptTurn }) => void,
  ) => () => void;
  /** `draft` seeds the composer (fork on a user message). */
  onTranscriptReset: (
    cb: (payload: { sessionId: string; turns: TranscriptTurn[]; draft?: string }) => void,
  ) => () => void;
  onQuestionSettled: (cb: (payload: { requestId: string }) => void) => () => void;
  onAskQuestion: (cb: (req: CursorAskQuestionRequest) => void) => () => void;
  /** `announced`: the voice agent will speak about it, so skip the completion sound. */
  onPromptComplete: (cb: (payload: { sessionId: string; announced?: boolean }) => void) => () => void;
  /** A reminder is due and the voice agent won't read it out. */
  onReminderChime: (cb: () => void) => () => void;
  /** Voice button / shortcut: start or stop. */
  toggleVoice: () => Promise<void>;
  getVoiceStatus: () => Promise<VoiceStatus>;
  getVoiceKeyInfo: () => Promise<VoiceKeyInfo>;
  /** Save the Inworld API key (encrypted in main); empty removes it. */
  setVoiceKey: (key: string) => Promise<void>;
  openVoiceLogFolder: () => Promise<void>;
  /** The newest few hundred voice log entries (across days), oldest first. */
  getVoiceLog: () => Promise<VoiceLogEntry[]>;
  /** Each voice log entry as it is written. */
  onVoiceLogEntry: (cb: (entry: VoiceLogEntry) => void) => () => void;
  /** Exchange the WebRTC SDP offer for Inworld's answer (main holds the key). */
  voiceAnswer: (offerSdp: string) => Promise<string>;
  voiceConnection: (event: VoiceConnectionEvent) => void;
  /** Relay a realtime server event from the data channel to main. */
  voiceServerEvent: (event: object) => void;
  onVoiceCommand: (cb: (command: VoiceCommand) => void) => () => void;
  /** Realtime client events main wants on the data channel. */
  onVoiceClientEvent: (cb: (event: object) => void) => () => void;
  onVoiceStatus: (cb: (status: VoiceStatus) => void) => () => void;
  onNavigateToEvent: (cb: (payload: { sessionId: string; turnId: string; eventId: string }) => void) => () => void;
  navigateToEvent: (sessionId: string, turnId: string, eventId: string) => Promise<void>;
}

declare global {
  interface Window {
    switcheroo: SwitcherooApi;
  }
}
