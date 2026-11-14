/** Ids for session menu items whose label/enabled state is refreshed at runtime. */
export const SESSION_MENU_IDS = {
  newSession: "session-new",
  pin: "session-toggle-pin",
  rename: "session-rename",
  fork: "session-fork",
  markUnread: "session-mark-unread",
  stop: "session-stop",
  close: "session-close",
  findInHistory: "session-find-in-history",
  nextTab: "session-next-tab",
  prevTab: "session-prev-tab",
  back: "session-back",
  forward: "session-forward",
} as const;
