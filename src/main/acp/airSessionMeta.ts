import type { AirForkPoint } from "./airForkPoint";

/**
 * `_meta.jetbrains.air` for a session request: `customInstructions`, which Claude appends to its system
 * prompt on new, load, resume and fork, and an optional fork point.
 */
export function airSessionMeta(
  instructions: string | null,
  forkPoint?: AirForkPoint,
): { _meta?: Record<string, unknown> } {
  const air = {
    ...(instructions ? { customInstructions: instructions } : {}),
    ...(forkPoint ? { fork: { version: 1, ...forkPoint } } : {}),
  };
  return Object.keys(air).length ? { _meta: { jetbrains: { air } } } : {};
}
