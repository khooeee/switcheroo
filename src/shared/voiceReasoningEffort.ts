/** Inworld realtime `reasoning.effort` values (case-sensitive on the wire); "DEFAULT" leaves it to the model. */
export const VOICE_REASONING_EFFORTS = ["NONE", "MINIMAL", "LOW", "MEDIUM", "HIGH", "DEFAULT"] as const;

export type VoiceReasoningEffort = (typeof VOICE_REASONING_EFFORTS)[number];
