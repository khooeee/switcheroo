import { useEffect } from "react";
import doneSoundUrl from "../../../../assets/done.mp3";
import { soundPreference } from "./soundPreference";

export function useCompletionSound(): void {
  useEffect(() => {
    const sound = new Audio(doneSoundUrl);
    sound.preload = "auto";
    const syncPreference = () => {
      sound.muted = !soundPreference.getSnapshot();
      if (sound.muted) {
        sound.pause();
        sound.currentTime = 0;
      }
    };
    syncPreference();
    const unsubscribePreference = soundPreference.subscribe(syncPreference);
    const unsubscribe = window.switcheroo.onPromptComplete(() => {
      syncPreference();
      if (sound.muted) return;
      sound.currentTime = 0;
      void sound.play().catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Could not play completion sound", error);
      });
    });
    return () => {
      unsubscribe();
      unsubscribePreference();
      sound.muted = true;
      sound.pause();
    };
  }, []);
}
