/** One line of the voice log: when, what kind, and that kind's fields. */
export type VoiceLogEntry = {
  at: number;
  kind: "heard" | "said" | "tool" | "notice" | "error" | "state" | "usage";
} & Record<string, unknown>;
