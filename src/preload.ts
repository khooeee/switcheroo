import { contextBridge, ipcRenderer } from "electron";
import type {
  ActiveTabId,
  AppSettings,
  CreateSessionInput,
  CursorAskQuestionRequest,
  FindInSessionsHit,
  SwitchboardTurn,
  PermissionRequest,
  SessionListPayload,
  SessionTab,
  SwitcherooApi,
  SessionStatus,
  TranscriptTurn,
} from "./shared/types";

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api: SwitcherooApi = {
  openInCursor: (sessionId, filePath) => ipcRenderer.invoke("files:openInCursor", sessionId, filePath),
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
  setActiveTab: (tabId: ActiveTabId) => ipcRenderer.invoke("sessions:setActive", tabId),
  createTerminalTab: (sessionId: string) =>
    ipcRenderer.invoke("sessions:createTerminal", sessionId) as Promise<SessionTab>,
  renameTab: (tabId: string, title: string) =>
    ipcRenderer.invoke("sessions:renameTab", tabId, title),
  closeTab: (tabId: string) => ipcRenderer.invoke("sessions:closeTab", tabId),
  setTabsExpanded: (sessionId: string, expanded: boolean) =>
    ipcRenderer.invoke("sessions:setTabsExpanded", sessionId, expanded),
  reorderTab: (sessionId: string, tabId: string, toIndex: number) =>
    ipcRenderer.invoke("sessions:reorderTab", sessionId, tabId, toIndex),
  moveTab: (tabId: string, toSessionId: string, toIndex: number) =>
    ipcRenderer.invoke("sessions:moveTab", tabId, toSessionId, toIndex),
  attachTerminal: (tabId: string) => ipcRenderer.invoke("terminal:attach", tabId),
  writeTerminal: (tabId: string, data: string) =>
    ipcRenderer.invoke("terminal:write", tabId, data),
  resizeTerminal: (tabId: string, cols: number, rows: number) =>
    ipcRenderer.invoke("terminal:resize", tabId, cols, rows),
  onTerminalData: (cb) => subscribe<{ tabId: string; data: string }>("terminal:data", cb),
  onTerminalExit: (cb) => subscribe<{ tabId: string }>("terminal:exit", cb),
  listSessions: () => ipcRenderer.invoke("sessions:list"),
  sendPrompt: (sessionId: string, text: string) =>
    ipcRenderer.invoke("session:prompt", sessionId, text),
  cancelPrompt: (sessionId: string) => ipcRenderer.invoke("session:cancel", sessionId),
  respondPermission: (requestId, optionId) =>
    ipcRenderer.invoke("session:permission", requestId, optionId),
  respondAskQuestion: (requestId, outcome) =>
    ipcRenderer.invoke("session:askQuestion", requestId, outcome),
  pickFolder: (startPath?: string) => ipcRenderer.invoke("fs:pickFolder", startPath),
  openTranscriptsFolder: () => ipcRenderer.invoke("fs:openTranscriptsFolder"),
  openSettingsFile: () => ipcRenderer.invoke("fs:openSettingsFile"),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (patch: Partial<AppSettings>) => ipcRenderer.invoke("settings:update", patch),
  savePastedImage: (sessionId, image) =>
    ipcRenderer.invoke("images:savePaste", sessionId, image.mimeType, image.bytes),
  saveClipboardImage: (sessionId) => ipcRenderer.invoke("images:saveClipboard", sessionId),
  showEditContextMenu: (opts) => ipcRenderer.invoke("edit:contextMenu", opts),
  showComposerContextMenu: (opts) => ipcRenderer.invoke("composer:contextMenu", opts),
  getTranscript: (sessionId: string) => ipcRenderer.invoke("transcript:get", sessionId),
  findInSessions: (query: string, searchId: number) =>
    ipcRenderer.invoke("sessions:findInSessions", query, searchId) as Promise<{ searchId: number }>,
  stopFindInSessions: () => ipcRenderer.invoke("sessions:stopFindInSessions"),
  navigateToEvent: (sessionId: string, turnId: string, eventId: string) =>
    ipcRenderer.invoke("sessions:navigateEvent", sessionId, turnId, eventId),
  onSessionsChanged: (cb) =>
    subscribe<SessionListPayload>("sessions:changed", cb),
  onSwitchboardTurn: (cb) => subscribe<SwitchboardTurn>("switchboard:turn", cb),
  onSwitchboardTurns: (cb) => subscribe<SwitchboardTurn[]>("switchboard:turns", cb),
  onSwitchboardSessionRemoved: (cb) =>
    subscribe<{ sessionId: string; message: string }>("switchboard:session-removed", cb),
  onTranscript: (cb) =>
    subscribe<{ sessionId: string; turn: TranscriptTurn }>("transcript", cb),
  onTranscriptReset: (cb) =>
    subscribe<{ sessionId: string; turns: TranscriptTurn[]; draft?: string }>("transcript:reset", cb),
  onPermission: (cb) => subscribe<PermissionRequest>("permission", cb),
  onQuestionSettled: (cb) => subscribe<{ requestId: string }>("question:settled", cb),
  onAskQuestion: (cb) => subscribe<CursorAskQuestionRequest>("ask-question", cb),
  onPromptComplete: (cb) => subscribe<{ sessionId: string }>("prompt:complete", cb),
  onSessionStatus: (cb) =>
    subscribe<{ sessionId: string; status: SessionStatus; error: string | null }>(
      "session-status",
      cb,
    ),
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

ipcRenderer.on("find:open", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:find"));
});

ipcRenderer.on("find:open-scoped", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:find-scoped"));
});

ipcRenderer.on("turn:details", (_event, payload: { turnId: string; eventId: string }) => {
  window.dispatchEvent(new CustomEvent("switcheroo:turn-details", { detail: payload }));
});

ipcRenderer.on("find-sessions:open", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:find-sessions"));
});

ipcRenderer.on("session:new", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:new-session"));
});

ipcRenderer.on("session:new-terminal", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:new-terminal"));
});

ipcRenderer.on("session:toggle-pin", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:toggle-pin"));
});

ipcRenderer.on("session:rename", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:rename-session"));
});

ipcRenderer.on("session:fork", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:fork-session"));
});

ipcRenderer.on("session:mark-unread", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:mark-unread"));
});

ipcRenderer.on("session:close", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:close-session"));
});

ipcRenderer.on("session:stop", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:stop-session"));
});

ipcRenderer.on("session:next", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:session-next"));
});

ipcRenderer.on("session:prev", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:session-prev"));
});

ipcRenderer.on("prompt:focus", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:focus-prompt"));
});
