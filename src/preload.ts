import { contextBridge, ipcRenderer } from "electron";
import type {
  ActiveTabId,
  CreateTabInput,
  CursorAskQuestionRequest,
  MasterEvent,
  PermissionRequest,
  SessionTab,
  SwitcherooApi,
  TabStatus,
  TranscriptItem,
} from "./shared/types";

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api: SwitcherooApi = {
  openInCursor: (tabId, filePath) => ipcRenderer.invoke("files:openInCursor", tabId, filePath),
  createTab: (input: CreateTabInput) => ipcRenderer.invoke("tabs:create", input),
  closeTab: (tabId: string) => ipcRenderer.invoke("tabs:close", tabId),
  deleteTab: (tabId: string) => ipcRenderer.invoke("tabs:delete", tabId),
  renameTab: (tabId: string, title: string) =>
    ipcRenderer.invoke("tabs:rename", tabId, title),
  setTabNotes: (tabId, notes) => ipcRenderer.invoke("tabs:setNotes", tabId, notes),
  setTabNotesWidth: (tabId, width) =>
    ipcRenderer.invoke("tabs:setNotesWidth", tabId, width),
  reorderTabs: (tabIds: string[]) => ipcRenderer.invoke("tabs:reorder", tabIds),
  setActiveTab: (tabId: ActiveTabId) => ipcRenderer.invoke("tabs:setActive", tabId),
  listTabs: () => ipcRenderer.invoke("tabs:list"),
  sendPrompt: (tabId: string, text: string) =>
    ipcRenderer.invoke("session:prompt", tabId, text),
  cancelPrompt: (tabId: string) => ipcRenderer.invoke("session:cancel", tabId),
  respondPermission: (requestId, optionId) =>
    ipcRenderer.invoke("session:permission", requestId, optionId),
  respondAskQuestion: (requestId, outcome) =>
    ipcRenderer.invoke("session:askQuestion", requestId, outcome),
  pickFolder: () => ipcRenderer.invoke("fs:pickFolder"),
  getTranscript: (tabId: string) => ipcRenderer.invoke("transcript:get", tabId),
  navigateToEvent: (tabId: string, eventId: string) =>
    ipcRenderer.invoke("tabs:navigateEvent", tabId, eventId),
  onTabsChanged: (cb) =>
    subscribe<{ tabs: SessionTab[]; activeTabId: ActiveTabId }>("tabs:changed", cb),
  onMasterEvent: (cb) => subscribe<MasterEvent>("master:event", cb),
  onMasterReset: (cb) => subscribe<MasterEvent[]>("master:reset", cb),
  onTranscript: (cb) =>
    subscribe<{ tabId: string; item: TranscriptItem; replaceId?: string }>(
      "transcript",
      cb,
    ),
  onTranscriptReset: (cb) =>
    subscribe<{ tabId: string; items: TranscriptItem[] }>("transcript:reset", cb),
  onPermission: (cb) => subscribe<PermissionRequest>("permission", cb),
  onAskQuestion: (cb) => subscribe<CursorAskQuestionRequest>("ask-question", cb),
  onPromptComplete: (cb) => subscribe<{ tabId: string }>("prompt:complete", cb),
  onTabStatus: (cb) =>
    subscribe<{ tabId: string; status: TabStatus; error: string | null }>(
      "tab-status",
      cb,
    ),
  onNavigateToEvent: (cb) =>
    subscribe<{ tabId: string; eventId: string }>("navigate-event", cb),
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
