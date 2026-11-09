import type { AirForkPoint } from "./airForkPoint";

/** `_meta.jetbrains.air` for a `session/fork` request that drops agent history after a message. */
export function airSessionMeta(forkPoint?: AirForkPoint): { _meta?: Record<string, unknown> } {
  return forkPoint ? { _meta: { jetbrains: { air: { fork: { version: 1, ...forkPoint } } } } } : {};
}
