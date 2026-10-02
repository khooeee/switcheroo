import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el?.closest("input, textarea, select, [contenteditable='true']");
}

function isModI(event: KeyboardEvent): boolean {
  if (!(event.metaKey || event.ctrlKey) || (event.metaKey && event.ctrlKey)) return false;
  if (event.altKey || event.shiftKey) return false;
  return event.key.toLowerCase() === "i";
}

/**
 * Selection + ArrowUp/Down navigation for main-feed user/assistant messages.
 * Space → onActivateSelected (right rail toggle).
 * Enter → onEnterSelected when provided (e.g. Switchboard jump to transcript).
 * Cmd/Ctrl+I → focus last selected message; with canFocusComposer, toggles back to prompt.
 */
export function useFeedMessageNav(
  eventIds: string[],
  scrollRef: RefObject<HTMLElement | null>,
  resetKey: string,
  onActivateSelected?: (eventId: string) => void,
  onEnterSelected?: (eventId: string) => void,
  canFocusComposer = false,
) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
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
      if (event.defaultPrevented || event.isComposing) return;
      if (document.querySelector("dialog[open]")) return;
      if (document.querySelector('[role="menu"]')) return;

      if (isModI(event)) {
        if (event.repeat) return;
        event.preventDefault();
        event.stopPropagation();

        const ids = eventIdsRef.current;
        const selected = selectedRef.current;
        const active = document.activeElement as HTMLElement | null;
        const onSelected = !!(
          selected &&
          active?.closest(`[data-event-id="${CSS.escape(selected)}"]`)
        );

        if (onSelected && canFocusComposer) {
          window.dispatchEvent(new CustomEvent("switcheroo:focus-prompt"));
          return;
        }

        const next =
          selected && ids.includes(selected) ? selected : (ids[ids.length - 1] ?? null);
        if (!next) {
          if (canFocusComposer) {
            window.dispatchEvent(new CustomEvent("switcheroo:focus-prompt"));
          }
          return;
        }
        setSelectedEventId(next);
        setFocusNonce((n) => n + 1);
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
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
      event.preventDefault();
      event.stopPropagation();
      activateRef.current(selected);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [idsKey, canFocusComposer]);

  useEffect(() => {
    if (!selectedEventId) return;
    const root = scrollRef.current;
    if (!root) return;
    const el = root.querySelector(
      `[data-event-id="${CSS.escape(selectedEventId)}"]`,
    ) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ block: "nearest" });
    // Cmd+I bumps focusNonce so we can steal focus back from the composer.
    if (focusNonce > 0 || !isTypingTarget(document.activeElement)) {
      el.focus({ preventScroll: true });
    }
  }, [selectedEventId, focusNonce, scrollRef]);

  return { selectedEventId, selectMessage };
}
