import { useEffect } from "react";
import { VoiceConnection } from "./VoiceConnection";

/** Own the voice WebRTC connection for the window's lifetime and obey main's commands. */
export function useVoiceConnection(): void {
  useEffect(() => {
    const connection = new VoiceConnection();
    const offCommand = window.switcheroo.onVoiceCommand((command) => connection.handle(command));
    const offEvent = window.switcheroo.onVoiceClientEvent((event) => connection.send(event));
    // After a reload main may think voice is still connected; this lets it reconnect.
    window.switcheroo.voiceConnection({ type: "ready" });
    return () => {
      offCommand();
      offEvent();
      connection.disconnect();
    };
  }, []);
}
