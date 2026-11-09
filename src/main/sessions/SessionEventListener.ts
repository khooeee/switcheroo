/** Called with each renderer IPC channel and payload as SessionState sends it. */
export type SessionEventListener = (channel: string, payload: unknown) => void;
