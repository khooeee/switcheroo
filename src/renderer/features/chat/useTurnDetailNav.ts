import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { requestFocusPane, subscribeFocusPane } from "../shortcuts/paneFocus";
import { detailEventIds } from "./detailEventIds";
import type { TranscriptTurn } from "../../../shared/types";

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el?.closest("input, textarea, select, [contenteditable='true']");
}

/**
 * Selection + ArrowUp/Down for turn-details events when the details pane is focused.
 * ArrowLeft → back to transcript. Space does nothing.
 * Enter → onEnterSelected when provided (Switchboard jump).
 */
export function useTurnDetailNav(
  turn: TranscriptTurn,
  scrollRef: RefObject<HTMLElement | null>,
  seedEventId?: string | null,
  onEnterSelected?: (eventId: string) => void,
) {
  const eventIds = detailEventIds(turn);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [active, setActive] = useState(false);
  const eventIdsRef = useRef(eventIds);
  eventIdsRef.current = eventIds;
  const selectedRef = useRef(selectedEventId);
  selectedRef.current = selectedEventId;
  const activeRef = useRef(active);
  activeRef.current = active;
  const seedRef = useRef(seedEventId);
  seedRef.current = seedEventId;
  const enterRef = useRef(onEnterSelected);
  enterRef.current = onEnterSelected;
  const idsKey = eventIds.join("\0");

  useEffect(() => {
    setSelectedEventId(null);
    setActive(false);
  }, [turn.id]);

  useEffect(() => {
    if (selectedEventId && !eventIdsRef.current.includes(selectedEventId)) {
      setSelectedEventId(null);
    }
  }, [idsKey, selectedEventId]);

  const selectEvent = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
    setActive(true);
    requestFocusPane("details");
  }, []);

  useEffect(() => {
    return subscribeFocusPane((pane) => {
      if (pane !== "details") {
        setActive(false);
        return;
      }
      const ids = eventIdsRef.current;
      const seed = seedRef.current;
      const next =
        (seed && ids.includes(seed) ? seed : null) ??
        selectedRef.current ??
        ids[0] ??
        null;
      if (next) setSelectedEventId(next);
      setActive(true);
      setFocusNonce((n) => n + 1);
    });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!activeRef.current) return;
      if (event.defaultPrevented || event.isComposing) return;
      if (document.querySelector("dialog[open]")) return;
      if (document.querySelector('[role="menu"]')) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (isTypingTarget(event.target)) return;

      // Space is intentionally inert in turn details.
      if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        event.stopPropagation();
        requestFocusPane("transcript");
        return;
      }

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const ids = eventIdsRef.current;
        if (!ids.length) return;
        event.preventDefault();
        event.stopPropagation();
        setSelectedEventId((prev) => {
          const idx = prev ? ids.indexOf(prev) : -1;
          if (event.key === "ArrowDown") {
            if (idx < 0) return ids[0] ?? null;
            return ids[Math.min(idx + 1, ids.length - 1)] ?? null;
          }
          if (idx < 0) return ids[ids.length - 1] ?? null;
          return ids[Math.max(idx - 1, 0)] ?? null;
        });
        return;
      }

      const selected = selectedRef.current;
      if (!selected) return;
      if (event.key === "Enter" && enterRef.current) {
        event.preventDefault();
        event.stopPropagation();
        enterRef.current(selected);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  useEffect(() => {
    if (!active || !selectedEventId) return;
    const root = scrollRef.current;
    if (!root) return;
    const el = root.querySelector(
      `[data-event-id="${CSS.escape(selectedEventId)}"]`,
    ) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ block: "nearest" });
    el.focus({ preventScroll: true });
  }, [selectedEventId, focusNonce, active, scrollRef]);

  return { selectedEventId: active ? selectedEventId : null, selectEvent };
}
