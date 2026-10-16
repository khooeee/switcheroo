import type { Session } from "../../shared/session";
import { controlBootstrapText } from "../../shared/controlBootstrapText";
import { supportsSwitcherooAware } from "../../shared/supportsSwitcherooAware";

/** The control API text an aware Claude or Codex session gets as its own instructions; null otherwise. */
export function sessionInstructions(session: Pick<Session, "id" | "agent" | "switcherooAware">): string | null {
  return session.switcherooAware && supportsSwitcherooAware(session.agent) ? controlBootstrapText(session.id) : null;
}
