import { Notification } from "electron";
import type { ReminderAlert } from "./ReminderAlert";

/** Shown notifications; a collected one stops delivering its click. */
const live = new Set<Notification>();

/**
 * Show a desktop notification, or call `onFailed` where the OS won't: macOS refuses apps that are not
 * properly code-signed, and the user may have turned notifications off.
 */
export function showNotification(alert: ReminderAlert, onFailed: () => void): void {
  if (!Notification.isSupported()) return onFailed();
  const { onClick, ...content } = alert;
  // The app plays its own chime.
  const notification = new Notification({ ...content, silent: true });
  const forget = () => live.delete(notification);
  notification.on("click", () => {
    forget();
    onClick();
  });
  notification.on("close", forget);
  notification.on("failed", (_event, error) => {
    forget();
    console.warn(`[reminders] notification failed: ${error}`);
    onFailed();
  });
  live.add(notification);
  notification.show();
}
