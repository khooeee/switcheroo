import { systemPreferences } from "electron";

/** On macOS, ask for (or confirm) microphone access before the renderer opens the mic. */
export async function ensureMicAccess(): Promise<void> {
  if (process.platform !== "darwin") return;
  const status = systemPreferences.getMediaAccessStatus("microphone");
  if (status === "granted") return;
  if (status === "not-determined" && (await systemPreferences.askForMediaAccess("microphone"))) return;
  throw new Error("Microphone access is off. Allow Switcheroo in System Settings → Privacy & Security → Microphone.");
}
