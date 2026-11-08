import { Menu } from "electron";
import { voiceToggleLabel } from "../../shared/voiceToggleLabel";
import type { VoiceStatus } from "../../shared/voiceStatus";
import { VOICE_MENU_IDS } from "./voiceMenuIds";

/** Update the Voice menu in place when the voice status changes. */
export function refreshVoiceMenuItems(status: VoiceStatus): void {
  const menu = Menu.getApplicationMenu();
  const toggle = menu?.getMenuItemById(VOICE_MENU_IDS.toggle);
  if (toggle) toggle.label = voiceToggleLabel(status.state);
}
