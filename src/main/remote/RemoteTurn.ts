/** A transcript turn trimmed to what the iOS app shows: the prompt, the reply and what the agent is doing. */
export interface RemoteTurn {
  id: string;
  at: number;
  status: "running" | "complete" | "stopped";
  user: string;
  queued?: boolean;
  assistant: string | null;
  /** Latest tool title (or "Thinking") while the turn runs. */
  activity?: string;
}
