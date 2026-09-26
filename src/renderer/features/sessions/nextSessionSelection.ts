import { sessionIdsInRange } from "./sessionIdsInRange";

export interface SessionSelection {
  selected: Set<string>;
  anchorId: string | null;
}

/** Next rail selection after a click (plain / shift-range / ctrl-meta toggle). */
export function nextSessionSelection(
  orderedIds: string[],
  current: SessionSelection,
  clickedId: string,
  modifiers: { shift: boolean; toggle: boolean },
): SessionSelection {
  if (modifiers.shift) {
    const anchor = current.anchorId && orderedIds.includes(current.anchorId)
      ? current.anchorId
      : clickedId;
    return {
      selected: new Set(sessionIdsInRange(orderedIds, anchor, clickedId)),
      anchorId: current.anchorId ?? clickedId,
    };
  }
  if (modifiers.toggle) {
    const selected = new Set(current.selected);
    if (selected.has(clickedId)) selected.delete(clickedId);
    else selected.add(clickedId);
    return { selected, anchorId: clickedId };
  }
  return { selected: new Set([clickedId]), anchorId: clickedId };
}
