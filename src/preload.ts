import { contextBridge, ipcRenderer } from "electron";
import type { ActiveTabId } from "./shared/activeTabId";
import type { CursorAskQuestionRequest } from "./shared/agentRequests";
import type { AppSettings } from "./shared/appSettings";
import type { CreateSessionInput } from "./shared/createSessionInput";
import type { FindInSessionsHit } from "./shared/findInSessionsHit";
import type { SessionTab } from "./shared/session";
import type { SwitchboardTurn } from "./shared/switchboardTurn";
import type { SessionListPayload, SwitcherooApi } from "./shared/switcherooApi";
import type { TranscriptTurn } from "./shared/transcript";

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api: SwitcherooApi = {
  openInCursor: (sessionId, filePath) => ipcRenderer.invoke("files:openInCursor", sessionId, filePath),
  openSessionInCursor: (sessionId) => ipcRenderer.invoke("sessions:openInCursor", sessionId),
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
  openSettingsFile: () => ipcRenderer.invoke("fs:openSettingsFile"),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (patch: Partial<AppSettings>) => ipcRenderer.invoke("settings:update", patch),
  savePastedImage: (sessionId, image) =>
    ipcRenderer.invoke("images:savePaste", sessionId, image.mimeType, image.bytes),
  saveClipboardImage: (sessionId) => ipcRenderer.invoke("images:saveClipboard", sessionId),
  showEditContextMenu: (opts) => ipcRenderer.invoke("edit:contextMenu", opts),
  showComposerContextMenu: (opts) => ipcRenderer.invoke("composer:contextMenu", opts),
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
  onSwitchboardTurn: (cb) => subscribe<SwitchboardTurn>("switchboard:turn", cb),
  onSwitchboardTurns: (cb) => subscribe<SwitchboardTurn[]>("switchboard:turns", cb),
  onSwitchboardSessionRemoved: (cb) =>
    subscribe<{ sessionId: string; message: string }>("switchboard:session-removed", cb),
  onTranscript: (cb) =>
    subscribe<{ sessionId: string; turn: TranscriptTurn }>("transcript", cb),
  onSubagentTurn: (cb) =>
    subscribe<{ sessionId: string; subagentId: string; turn: TranscriptTurn }>("subagent:turn", cb),
  onTranscriptReset: (cb) =>
    subscribe<{ sessionId: string; turns: TranscriptTurn[]; draft?: string }>("transcript:reset", cb),
  onQuestionSettled: (cb) => subscribe<{ requestId: string }>("question:settled", cb),
  onAskQuestion: (cb) => subscribe<CursorAskQuestionRequest>("ask-question", cb),
  onPromptComplete: (cb) => subscribe<{ sessionId: string }>("prompt:complete", cb),
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
  "session:new-terminal": "switcheroo:new-terminal",
  "session:toggle-pin": "switcheroo:toggle-pin",
  "session:rename": "switcheroo:rename-session",
  "session:fork": "switcheroo:fork-session",
  "session:mark-unread": "switcheroo:mark-unread",
  "session:close": "switcheroo:close-session",
  "session:stop": "switcheroo:stop-session",
  "session:next": "switcheroo:session-next",
  "session:prev": "switcheroo:session-prev",
  "prompt:focus": "switcheroo:focus-prompt",
  "prompt:paste-aware": "switcheroo:paste-aware-prompt",
  "filter:focus": "switcheroo:focus-filter",
  "switchboard:open": "switcheroo:open-switchboard",
};

for (const [channel, eventName] of Object.entries(MENU_EVENTS)) {
  ipcRenderer.on(channel, (_event, detail?: unknown) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  });
}
