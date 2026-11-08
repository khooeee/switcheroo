import { useEffect } from "react";
import type { VoiceStatus } from "../../../shared/voiceStatus";
import { playVoiceOnChime } from "./playVoiceOnChime";
import { voiceStatusStore } from "./voiceStatusStore";

/** Chime when voice goes from off to listening (reconnects stay quiet). */
export function useVoiceOnChime(): void {
  useEffect(() => {
    let settled: VoiceStatus["state"] = voiceStatusStore.getSnapshot().state;
    return voiceStatusStore.subscribe(() => {
      const { state } = voiceStatusStore.getSnapshot();
      if (state === "connecting") return;
      if (state === "listening" && settled === "off") playVoiceOnChime();
      settled = state;
    });
  }, []);
}
