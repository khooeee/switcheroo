import { Notification } from "electron";

/** Shown notifications; a collected one stops delivering its click. */
const live = new Set<Notification>();

/** Show a desktop notification; does nothing where the OS has none. */
export function showNotification(options: {
  title: string;
  /** macOS only. */
  subtitle?: string;
  body: string;
  onClick: () => void;
}): void {
  if (!Notification.isSupported()) return;
  const { onClick, ...content } = options;
  const notification = new Notification(content);
  const forget = () => live.delete(notification);
  notification.on("click", () => {
    forget();
    onClick();
  });
  notification.on("close", forget);
  live.add(notification);
  notification.show();
}
