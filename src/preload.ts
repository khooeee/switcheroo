import { contextBridge, ipcRenderer } from "electron";
import type {
  ActiveSessionId,
  CreateSessionInput,
  CursorAskQuestionRequest,
  MasterEvent,
  PermissionRequest,
  Session,
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
  setSessionNotes: (sessionId, notes) => ipcRenderer.invoke("sessions:setNotes", sessionId, notes),
  setSessionNotesWidth: (sessionId, width) =>
    ipcRenderer.invoke("sessions:setNotesWidth", sessionId, width),
  reorderSessions: (sessionIds: string[]) => ipcRenderer.invoke("sessions:reorder", sessionIds),
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
  savePastedImage: (sessionId, image) =>
    ipcRenderer.invoke("images:savePaste", sessionId, image.mimeType, image.bytes),
  saveClipboardImage: (sessionId) => ipcRenderer.invoke("images:saveClipboard", sessionId),
  getTranscript: (sessionId: string) => ipcRenderer.invoke("transcript:get", sessionId),
  navigateToEvent: (sessionId: string, eventId: string) =>
    ipcRenderer.invoke("sessions:navigateEvent", sessionId, eventId),
  onSessionsChanged: (cb) =>
    subscribe<{ sessions: Session[]; activeSessionId: ActiveSessionId }>("sessions:changed", cb),
  onMasterEvent: (cb) => subscribe<MasterEvent>("master:event", cb),
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
};

contextBridge.exposeInMainWorld("switcheroo", api);

// Find shortcut from menu
ipcRenderer.on("find:open", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:find"));
});

ipcRenderer.on("session:new", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:new-session"));
});

ipcRenderer.on("prompt:focus", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:focus-prompt"));
});

ipcRenderer.on("rail:focus", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:focus-rail"));
});

ipcRenderer.on("notes:focus", () => {
  window.dispatchEvent(new CustomEvent("switcheroo:focus-notes"));
});
