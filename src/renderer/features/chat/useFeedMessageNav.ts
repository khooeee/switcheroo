import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el?.closest("input, textarea, select, [contenteditable='true']");
}

/**
 * Selection + ArrowUp/Down navigation for main-feed user/assistant messages.
 * Space → onActivateSelected (right rail toggle).
 * Enter → onEnterSelected when provided (e.g. Switchboard jump to transcript).
 */
export function useFeedMessageNav(
  eventIds: string[],
  scrollRef: RefObject<HTMLElement | null>,
  resetKey: string,
  onActivateSelected?: (eventId: string) => void,
  onEnterSelected?: (eventId: string) => void,
) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const eventIdsRef = useRef(eventIds);
  eventIdsRef.current = eventIds;
  const selectedRef = useRef(selectedEventId);
  selectedRef.current = selectedEventId;
  const activateRef = useRef(onActivateSelected);
  activateRef.current = onActivateSelected;
  const enterRef = useRef(onEnterSelected);
  enterRef.current = onEnterSelected;
  const idsKey = eventIds.join("\0");

  useEffect(() => {
    setSelectedEventId(null);
  }, [resetKey]);

  useEffect(() => {
    if (selectedEventId && !eventIdsRef.current.includes(selectedEventId)) {
      setSelectedEventId(null);
    }
  }, [idsKey, selectedEventId]);

  const selectMessage = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (event.defaultPrevented || event.isComposing) return;
      if (document.querySelector("dialog[open]")) return;
      if (document.querySelector('[role="menu"]')) return;
      if (isTypingTarget(event.target)) return;

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const ids = eventIdsRef.current;
        if (!ids.length) return;
        event.preventDefault();
        setSelectedEventId((prev) => {
          const idx = prev ? ids.indexOf(prev) : -1;
          if (event.key === "ArrowDown") {
            if (idx < 0) return ids[0] ?? null;
            return ids[(idx + 1) % ids.length] ?? null;
          }
          if (idx < 0) return ids[ids.length - 1] ?? null;
          return ids[(idx - 1 + ids.length) % ids.length] ?? null;
        });
        return;
      }

      const selected = selectedRef.current;
      if (!selected) return;

      if (event.key === "Enter" && enterRef.current) {
        event.preventDefault();
        event.stopPropagation();
        enterRef.current(selected);
        return;
      }

      if (event.key !== " " && event.key !== "Spacebar") return;
      if (!activateRef.current) return;
      // Capture phase: act on selection before a previously focused message sees Space.
      event.preventDefault();
      event.stopPropagation();
      activateRef.current(selected);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [idsKey]);

  useEffect(() => {
    if (!selectedEventId) return;
    const root = scrollRef.current;
    if (!root) return;
    const el = root.querySelector(
      `[data-event-id="${CSS.escape(selectedEventId)}"]`,
    ) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ block: "nearest" });
    if (!isTypingTarget(document.activeElement)) {
      el.focus({ preventScroll: true });
    }
  }, [selectedEventId, scrollRef]);

  return { selectedEventId, selectMessage };
}
