import { useEffect } from "react";
import { playReminderChime } from "./playReminderChime";
import { soundPreference } from "./soundPreference";

/** Chime when a reminder is due, unless sounds are off. */
export function useReminderChime(): void {
  useEffect(() => {
    let context: AudioContext | null = null;
    const unsubscribe = window.switcheroo.onReminderChime(() => {
      if (!soundPreference.getSnapshot()) return;
      context ??= new AudioContext();
      void context.resume().then(() => playReminderChime(context!));
    });
    return () => {
      unsubscribe();
      void context?.close();
    };
  }, []);
}
