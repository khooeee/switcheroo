import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";
import { pinScrollToBottom } from "./pinScrollToBottom";
import { trackScrollPosition } from "./trackScrollPosition";

export function useSessionScrollPosition(
  sessionId: string,
  scrollRef: RefObject<HTMLElement | null>,
  pinByDefault = true,
): () => void {
  const positions = useRef(new Map<string, { top: number; pinned: boolean }>());
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element || !sessionId) return;
    const position = positions.current.get(sessionId) ?? { top: 0, pinned: pinByDefault };
    positions.current.set(sessionId, position);
    return trackScrollPosition(element, position);
  }, [sessionId, scrollRef, pinByDefault]);

  return useCallback(() => {
    const id = sessionIdRef.current;
    const element = scrollRef.current;
    if (!element || !id) return;
    const position = positions.current.get(id) ?? { top: 0, pinned: true };
    positions.current.set(id, position);
    pinScrollToBottom(element, position);
  }, [scrollRef]);
}
