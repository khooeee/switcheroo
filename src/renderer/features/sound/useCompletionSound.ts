import { useEffect } from "react";
import doneSoundUrl from "../../../../assets/done.mp3";

export function useCompletionSound(): void {
  useEffect(() => {
    const sound = new Audio(doneSoundUrl);
    sound.preload = "auto";
    const unsubscribe = window.switcheroo.onPromptComplete(() => {
      sound.currentTime = 0;
      void sound.play().catch((error: unknown) => {
        console.error("Could not play completion sound", error);
      });
    });
    return () => {
      unsubscribe();
      sound.pause();
    };
  }, []);
}
