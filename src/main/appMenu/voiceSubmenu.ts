import type { MenuItemConstructorOptions } from "electron";
import { voiceToggleLabel } from "../../shared/voiceToggleLabel";
import type { VoiceMenuActions } from "./VoiceMenuActions";
import { VOICE_MENU_IDS } from "./voiceMenuIds";

/** Items under the Voice menu; the toggle label follows the voice status. */
export function voiceSubmenu(voice: VoiceMenuActions): MenuItemConstructorOptions[] {
  const { state } = voice.getStatus();
  return [
    {
      id: VOICE_MENU_IDS.toggle,
      label: voiceToggleLabel(state),
      click: () => voice.toggle(),
    },
    { type: "separator" },
    { label: "Open Voice Settings", click: () => voice.openSettings() },
    { label: "Open Voice Log Folder", click: () => voice.openLog() },
  ];
}
