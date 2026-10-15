import type { TranscriptItem } from "../../../shared/transcript";

const NONE: string[] = [];

/** Every image a turn's tools returned, in order and without repeats. */
export function turnImages(events: readonly TranscriptItem[]): string[] {
  const names = new Set<string>();
  for (const event of events) {
    for (const name of event.images ?? NONE) names.add(name);
  }
  // A shared empty list keeps memoized messages stable for turns without images.
  return names.size ? [...names] : NONE;
}
