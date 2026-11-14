import type { BrowserWindow } from "electron";
import { revealWindow } from "../lifecycle/revealWindow";
import type { SessionManager } from "../sessions/SessionManager";
import type { VoiceAgent } from "../voice/VoiceAgent";
import { sessionLabel } from "../voice/sessionLabel";
import type { Reminder } from "./Reminder";
import { showNotification } from "./showNotification";

type Deps = {
  sessions: SessionManager;
  voice: VoiceAgent;
  getWindow: () => BrowserWindow | null;
};

/** Tell the user a reminder is due: a notification that opens its session, spoken too while voice is on. */
export function fireReminder(reminder: Reminder, { sessions, voice, getWindow }: Deps): void {
  const session = reminder.sessionId ? sessions.getSession(reminder.sessionId) : undefined;
  showNotification({
    title: "Reminder",
    subtitle: session ? sessionLabel(session) : undefined,
    body: reminder.message,
    onClick: () => {
      const win = getWindow();
      if (win) revealWindow(win);
      if (reminder.sessionId) void sessions.setActiveTab(reminder.sessionId);
    },
  });
  voice.announceReminder(reminder.message, session);
}
