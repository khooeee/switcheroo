import { useLayoutEffect, useRef, type RefObject } from "react";
import { trackScrollPosition } from "./trackScrollPosition";

export function useSessionScrollPosition(
  sessionId: string,
  scrollRef: RefObject<HTMLElement | null>,
  pinByDefault = true,
): void {
  const positions = useRef(new Map<string, { top: number; pinned: boolean }>());

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element || !sessionId) return;
    const position = positions.current.get(sessionId) ?? { top: 0, pinned: pinByDefault };
    positions.current.set(sessionId, position);
    return trackScrollPosition(element, position);
  }, [sessionId, scrollRef, pinByDefault]);
}
