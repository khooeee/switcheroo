/** Voice agent connection as the rail button shows it. */
export interface VoiceStatus {
  state: "off" | "connecting" | "listening";
  /** What the voice agent is doing while connected. */
  activity: "idle" | "thinking" | "speaking";
  /** Last connection or setup failure; cleared on the next start. */
  error: string | null;
}
