import { useCallback } from "react";
import type { TranscriptTurn } from "../../../shared/transcript";
import { RIGHT_RAIL_LATEST } from "./rightRailLatest";

/** Stable handlers that open a turn's right rail at its user message, its latest activity, or its assistant reply. */
export function useTurnRailOpeners(
  turn: TranscriptTurn,
  onOpenRightRail: (turnId: string, focusEventId?: string) => void,
) {
  const openRail = useCallback(
    (eventId: string) => onOpenRightRail(turn.id, eventId),
    [onOpenRightRail, turn.id],
  );
  const userId = turn.user.id;
  const assistantId = turn.assistant?.id;
  const openUser = useCallback(() => openRail(userId), [openRail, userId]);
  const openLatest = useCallback(() => openRail(RIGHT_RAIL_LATEST), [openRail]);
  const openAssistant = useCallback(() => {
    if (assistantId) openRail(assistantId);
  }, [openRail, assistantId]);
  return { openUser, openLatest, openAssistant };
}
