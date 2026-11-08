/** Renderer → main voice connection lifecycle: `ready` means the renderer has no connection (load or reload). */
export type VoiceConnectionEvent =
  | { type: "ready" }
  | { type: "open" }
  | { type: "closed" }
  | { type: "failed"; error: string };
