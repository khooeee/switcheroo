import type { SWITCHBOARD_ID } from "./switchboardId";

/** Active rail selection: Switchboard, a chat parent, or a child tab id. */
export type ActiveTabId = typeof SWITCHBOARD_ID | string;

/** @deprecated Use ActiveTabId. */
export type ActiveSessionId = ActiveTabId;
