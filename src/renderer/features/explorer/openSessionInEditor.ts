import { railModeStore } from "./railModeStore";

/** Select the session and switch to File Explorer mode on its project folder. */
export async function openSessionInEditor(sessionId: string): Promise<void> {
  await window.switcheroo.setActiveTab(sessionId);
  railModeStore.set("files");
}
