import type { BrowserWindow } from "electron";
import type { ConfigMenuCategory } from "../../shared/configMenuCategory";
import { showConfigOptionMenu } from "../contextMenus/showConfigOptionMenu";
import type { SessionDeps } from "./SessionDeps";

/** Pop the model or effort picker for a session (connecting its agent if needed) and apply the pick. */
export async function showSessionConfigMenu(
  { hydration, agents }: SessionDeps,
  win: BrowserWindow | null,
  sessionId: string,
  category: ConfigMenuCategory,
): Promise<void> {
  const session = await hydration.ensure(sessionId);
  if (!session) throw new Error("No session");
  const acp = await agents.ensureSession(session);
  const choice = await showConfigOptionMenu(win, acp.config.list(), category);
  if (choice) await acp.config.set(choice.configId, choice.value);
}
