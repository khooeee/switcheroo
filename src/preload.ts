import { contextBridge, ipcRenderer } from "electron";
import type {
  ActiveSessionId,
  AppSettings,
  CreateSessionInput,
  CursorAskQuestionRequest,
  FindInSessionsHit,
  SwitchboardEvent,
  PermissionRequest,
  SessionListPayload,
  SwitcherooApi,
  SessionStatus,
  TranscriptItem,
} from "./shared/types";

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api: SwitcherooApi = {
  openInCursor: (sessionId, filePath) => ipcRenderer.invoke("files:openInCursor", sessionId, filePath),
  createSession: (input: CreateSessionInput) => ipcRenderer.invoke("sessions:create", input),
  forkSession: (sessionId, eventId) =>
    ipcRenderer.invoke("sessions:fork", sessionId, eventId),
  closeSession: (sessionId: string) => ipcRenderer.invoke("sessions:close", sessionId),
  renameSession: (sessionId: string, title: string) =>
    ipcRenderer.invoke("sessions:rename", sessionId, title),
  reorderPinnedSessions: (sessionIds: string[]) =>
    ipcRenderer.invoke("sessions:reorderPinned", sessionIds),
  pinSession: (sessionId: string) => ipcRenderer.invoke("sessions:pin", sessionId),
  unpinSession: (sessionId: string) => ipcRenderer.invoke("sessions:unpin", sessionId),
  setActiveSession: (sessionId: ActiveSessionId) => ipcRenderer.invoke("sessions:setActive", sessionId),
  listSessions: () => ipcRenderer.invoke("sessions:list"),
  sendPrompt: (sessionId: string, text: string) =>
    ipcRenderer.invoke("session:prompt", sessionId, text),
  cancelPrompt: (sessionId: string) => ipcRenderer.invoke("session:cancel", sessionId),
  respondPermission: (requestId, optionId) =>
    ipcRenderer.invoke("session:permission", requestId, optionId),
  respondAskQuestion: (requestId, outcome) =>
    ipcRenderer.invoke("session:askQuestion", requestId, outcome),
  pickFolder: () => ipcRenderer.invoke("fs:pickFolder"),
  openTranscriptsFolder: () => ipcRenderer.invoke("fs:openTranscriptsFolder"),
  openSettingsFile: () => ipcRenderer.invoke("fs:openSettingsFile"),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (patch: Partial<AppSettings>) => ipcRenderer.invoke("settings:update", patch),
  savePastedImage: (sessionId, image) =>
    ipcRenderer.invoke("images:savePaste", sessionId, image.mimeType, image.bytes),
  saveClipboardImage: (sessionId) => ipcRenderer.invoke("images:saveClipboard", sessionId),
  getTranscript: (sessionId: string) => ipcRenderer.invoke("transcript:get", sessionId),
  findInSessions: (query: string, searchId: number) =>
    ipcRenderer.invoke("sessions:findInSessions", query, searchId) as Promise<{ searchId: number }>,
  stopFindInSessions: () => ipcRenderer.invoke("sessions:stopFindInSessions"),
  navigateToEvent: (sessionId: string, eventId: string) =>
    ipcRenderer.invoke("sessions:navigateEvent", sessionId, eventId),
  onSessionsChanged: (cb) =>
    subscribe<SessionListPayload>("sessions:changed", cb),
  onSwitchboardEvent: (cb) => subscribe<SwitchboardEvent>("switchboard:event", cb),
  onSwitchboardEvents: (cb) => subscribe<SwitchboardEvent[]>("switchboard:events", cb),
  onSwitchboardSessionRemoved: (cb) =>
    subscribe<{ sessionId: string; message: string }>("switchboard:session-removed", cb),
  onTranscript: (cb) =>
    subscribe<{ sessionId: string; item: TranscriptItem; replaceId?: string }>(
      "transcript",
      cb,
    ),
  onTranscriptReset: (cb) =>
    subscribe<{ sessionId: string; items: TranscriptItem[] }>("transcript:reset", cb),
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
    subscribe<{ sessionId: string; eventId: string }>("navigate-event", cb),
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

// Find shortcut from menu
ipcRenderer.on("find:open", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:find"));
});

ipcRenderer.on("find-sessions:open", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:find-sessions"));
});

ipcRenderer.on("session:new", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:new-session"));
});

ipcRenderer.on("session:toggle-pin", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:toggle-pin"));
});

ipcRenderer.on("session:rename", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:rename-session"));
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
