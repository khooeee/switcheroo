import type { SessionCallbacks } from "../acp/SessionCallbacks";

/** No-op callbacks for pre-started sessions that have not been adopted yet. */
export const warmCallbacks: SessionCallbacks = {
  onPromptComplete: () => undefined,
  onSteeringSupport: () => undefined,
  onForkSupport: () => undefined,
  onAvailableCommands: () => undefined,
  onUsage: () => undefined,
  onTurn: () => undefined,
  onStatus: () => undefined,
  onPermission: () => undefined,
  onAskQuestion: () => undefined,
  getSessionTitle: () => "Warm",
};
