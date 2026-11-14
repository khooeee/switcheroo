import { contextBridge, ipcRenderer } from "electron";
import type { CursorAskQuestionRequest } from "./shared/agentRequests";
import type { AppSettings } from "./shared/appSettings";
import type { CreateSessionInput } from "./shared/createSessionInput";
import type { FindInSessionsHit } from "./shared/findInSessionsHit";
import type { SessionListPayload, SwitcherooApi } from "./shared/switcherooApi";
import type { TranscriptTurn } from "./shared/transcript";
import type { VoiceCommand } from "./shared/voiceCommand";
import type { VoiceLogEntry } from "./shared/voiceLogEntry";
import type { VoiceStatus } from "./shared/voiceStatus";

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api: SwitcherooApi = {
  availableAgents: () => ipcRenderer.invoke("agents:available"),
  createSession: (input: CreateSessionInput) => ipcRenderer.invoke("sessions:create", input),
  forkSession: (sessionId, eventId) =>
    ipcRenderer.invoke("sessions:fork", sessionId, eventId),
  closeSession: (sessionId: string) => ipcRenderer.invoke("sessions:close", sessionId),
  renameSession: (sessionId: string, title: string) =>
    ipcRenderer.invoke("sessions:rename", sessionId, title),
  pinSession: (sessionId: string) => ipcRenderer.invoke("sessions:pin", sessionId),
  unpinSession: (sessionId: string) => ipcRenderer.invoke("sessions:unpin", sessionId),
  setActiveSessionUnread: (unread) => ipcRenderer.invoke("sessions:setActiveUnread", unread),
  setActiveTab: (tabId: string) => ipcRenderer.invoke("sessions:setActive", tabId),
  listSessions: () => ipcRenderer.invoke("sessions:list"),
  sendPrompt: (sessionId: string, text: string) =>
    ipcRenderer.invoke("session:prompt", sessionId, text),
  cancelPrompt: (sessionId: string) => ipcRenderer.invoke("session:cancel", sessionId),
  respondAskQuestion: (requestId, outcome) =>
    ipcRenderer.invoke("session:askQuestion", requestId, outcome),
  pickFolder: (startPath?: string) => ipcRenderer.invoke("fs:pickFolder", startPath),
  saveMarkdown: (text: string, nameHint?: string) =>
    ipcRenderer.invoke("fs:saveMarkdown", text, nameHint),
  openTranscriptsFolder: () => ipcRenderer.invoke("fs:openTranscriptsFolder"),
  openCronsFile: () => ipcRenderer.invoke("fs:openCronsFile"),
  openRemindersFile: () => ipcRenderer.invoke("fs:openRemindersFile"),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (patch: Partial<AppSettings>) => ipcRenderer.invoke("settings:update", patch),
  getRemoteStatus: () => ipcRenderer.invoke("remote:status"),
  rotateControlToken: () => ipcRenderer.invoke("control:rotateToken"),
  savePastedImage: (sessionId, image) =>
    ipcRenderer.invoke("images:savePaste", sessionId, image.mimeType, image.bytes),
  saveClipboardImage: (sessionId) => ipcRenderer.invoke("images:saveClipboard", sessionId),
  showEditContextMenu: (opts) => ipcRenderer.invoke("edit:contextMenu", opts),
  showComposerContextMenu: (opts) => ipcRenderer.invoke("composer:contextMenu", opts),
  showImageContextMenu: (name) => ipcRenderer.invoke("image:contextMenu", name),
  showConfigMenu: (sessionId, category) => ipcRenderer.invoke("session:configMenu", sessionId, category),
  listSessionDir: (sessionId, relPath) => ipcRenderer.invoke("files:list", sessionId, relPath),
  listSessionFiles: (sessionId) => ipcRenderer.invoke("files:listAll", sessionId),
  readSessionFile: (sessionId, relPath) => ipcRenderer.invoke("files:read", sessionId, relPath),
  writeSessionFile: (sessionId, relPath, text, baseMtimeMs) =>
    ipcRenderer.invoke("files:write", sessionId, relPath, text, baseMtimeMs),
  confirmUnsavedChanges: (names) => ipcRenderer.invoke("files:confirmUnsaved", names),
  watchSessionFiles: (sessionId) => ipcRenderer.invoke("files:watch", sessionId),
  unwatchSessionFiles: (sessionId) => ipcRenderer.invoke("files:unwatch", sessionId),
  onSessionFilesChanged: (cb) =>
    subscribe<{ sessionId: string; paths: string[] | null }>("files:changed", cb),
  getExplorerState: (sessionId) => ipcRenderer.invoke("files:getExplorer", sessionId),
  saveExplorerState: (sessionId, state) => ipcRenderer.invoke("files:saveExplorer", sessionId, state),
  onPrepareQuit: (cb) => subscribe<{ requestId: number }>("app:prepareQuit", cb),
  quitReady: (requestId, ok) => ipcRenderer.send("app:quitReady", requestId, ok),
  getTranscript: (sessionId: string) => ipcRenderer.invoke("transcript:get", sessionId),
  getSubagentTranscript: (sessionId: string, subagentId: string) =>
    ipcRenderer.invoke("subagent:transcript", sessionId, subagentId),
  findInSessions: (query: string, searchId: number) =>
    ipcRenderer.invoke("sessions:findInSessions", query, searchId) as Promise<{ searchId: number }>,
  stopFindInSessions: () => ipcRenderer.invoke("sessions:stopFindInSessions"),
  navigateToEvent: (sessionId: string, turnId: string, eventId: string) =>
    ipcRenderer.invoke("sessions:navigateEvent", sessionId, turnId, eventId),
  onSessionsChanged: (cb) =>
    subscribe<SessionListPayload>("sessions:changed", cb),
  onSessionRemoved: (cb) => subscribe<{ message: string }>("session:removed", cb),
  onTranscript: (cb) =>
    subscribe<{ sessionId: string; turn: TranscriptTurn }>("transcript", cb),
  onSubagentTurn: (cb) =>
    subscribe<{ sessionId: string; subagentId: string; turn: TranscriptTurn }>("subagent:turn", cb),
  onTranscriptReset: (cb) =>
    subscribe<{ sessionId: string; turns: TranscriptTurn[]; draft?: string }>("transcript:reset", cb),
  onQuestionSettled: (cb) => subscribe<{ requestId: string }>("question:settled", cb),
  onAskQuestion: (cb) => subscribe<CursorAskQuestionRequest>("ask-question", cb),
  onPromptComplete: (cb) => subscribe<{ sessionId: string; announced?: boolean }>("prompt:complete", cb),
  onReminderChime: (cb) => subscribe<void>("reminder:chime", cb),
  toggleVoice: () => ipcRenderer.invoke("voice:toggle"),
  getVoiceStatus: () => ipcRenderer.invoke("voice:status"),
  getVoiceKeyInfo: () => ipcRenderer.invoke("voice:keyInfo"),
  setVoiceKey: (key) => ipcRenderer.invoke("voice:setKey", key),
  openVoiceLogFolder: () => ipcRenderer.invoke("fs:openVoiceLogFolder"),
  getVoiceLog: () => ipcRenderer.invoke("voice:log"),
  onVoiceLogEntry: (cb) => subscribe<VoiceLogEntry>("voice:log-entry", cb),
  voiceAnswer: (offerSdp) => ipcRenderer.invoke("voice:answer", offerSdp),
  voiceConnection: (event) => ipcRenderer.send("voice:connection", event),
  voiceServerEvent: (event) => ipcRenderer.send("voice:server-event", event),
  onVoiceCommand: (cb) => subscribe<VoiceCommand>("voice:command", cb),
  onVoiceClientEvent: (cb) => subscribe<object>("voice:client-event", cb),
  onVoiceStatus: (cb) => subscribe<VoiceStatus>("voice:status", cb),
  onNavigateToEvent: (cb) =>
    subscribe<{ sessionId: string; turnId: string; eventId: string }>("navigate-event", cb),
  onFindProgress: (cb) =>
    subscribe<{
      searchId: number;
      scanned: number;
      total: number;
      matchCount: number;
    }>("find:progress", cb),
  onFindChunk: (cb) =>
    subscribe<{ searchId: number; added: FindInSessionsHit[] }>("find:chunk", cb),
  onFindDone: (cb) =>
    subscribe<{ searchId: number; stopped: boolean }>("find:done", cb),
};

contextBridge.exposeInMainWorld("switcheroo", api);

/** Menu IPC channel → window event the renderer listens for (payload, if any, becomes `detail`). */
const MENU_EVENTS: Record<string, string> = {
  "find:open": "switcheroo:find",
  "find:open-scoped": "switcheroo:find-scoped",
  "turn:details": "switcheroo:turn-details",
  "markdown:save-view": "switcheroo:save-view-markdown",
  "find-sessions:open": "switcheroo:find-sessions",
  "session:new": "switcheroo:new-session",
  "session:toggle-pin": "switcheroo:toggle-pin",
  "session:rename": "switcheroo:rename-session",
  "session:fork": "switcheroo:fork-session",
  "session:mark-unread": "switcheroo:mark-unread",
  "session:close": "switcheroo:close-session",
  "session:stop": "switcheroo:stop-session",
  "session:next": "switcheroo:session-next",
  "session:prev": "switcheroo:session-prev",
  "session:back": "switcheroo:session-back",
  "session:forward": "switcheroo:session-forward",
  "prompt:focus": "switcheroo:focus-prompt",
  "filter:focus": "switcheroo:focus-filter",
  "settings:open": "switcheroo:open-settings",
  "explorer:toggle": "switcheroo:toggle-explorer",
  "session:open-in-editor": "switcheroo:open-in-editor",
};

for (const [channel, eventName] of Object.entries(MENU_EVENTS)) {
  ipcRenderer.on(channel, (_event, detail?: unknown) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  });
}
