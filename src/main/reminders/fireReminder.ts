import { app, type BrowserWindow } from "electron";
import { revealWindow } from "../lifecycle/revealWindow";
import type { SessionManager } from "../sessions/SessionManager";
import type { VoiceAgent } from "../voice/VoiceAgent";
import { sessionLabel } from "../voice/sessionLabel";
import type { Reminder } from "./Reminder";
import type { ReminderAlert } from "./ReminderAlert";
import { reminderToasts } from "./reminderToasts";
import { showNotification } from "./showNotification";

type Deps = {
  sessions: SessionManager;
  voice: VoiceAgent;
  getWindow: () => BrowserWindow | null;
};

/**
 * Tell the user a reminder is due: a notification (or an in-app toast where the OS refuses one) that
 * opens its session, a dock bounce, and speech while voice is on.
 */
export function fireReminder(reminder: Reminder, { sessions, voice, getWindow }: Deps): void {
  const session = reminder.sessionId ? sessions.getSession(reminder.sessionId) : undefined;
  const alert: ReminderAlert = {
    title: "Reminder",
    subtitle: session ? sessionLabel(session) : undefined,
    body: reminder.message,
    onClick: () => {
      // A toast click leaves another app frontmost.
      app.focus({ steal: true });
      const win = getWindow();
      if (win) revealWindow(win);
      if (reminder.sessionId) void sessions.setActiveTab(reminder.sessionId);
    },
  };
  showNotification(alert, () => reminderToasts.show(alert, sessions.getSettings().theme));
  app.dock?.bounce("informational");
  voice.announceReminder(reminder.message, session);
}
