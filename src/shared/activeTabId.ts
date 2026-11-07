import type { SWITCHBOARD_ID } from "./switchboardId";

/** Active rail selection: Switchboard or a chat session id. */
export type ActiveTabId = typeof SWITCHBOARD_ID | string;
