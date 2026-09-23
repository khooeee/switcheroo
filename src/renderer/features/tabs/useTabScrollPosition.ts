import { useLayoutEffect, useRef, type RefObject } from "react";
import { trackScrollPosition } from "./trackScrollPosition";

export function useTabScrollPosition(tabId: string, scrollRef: RefObject<HTMLDivElement | null>): void {
  const positions = useRef(new Map<string, { top: number; pinned: boolean }>());

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const position = positions.current.get(tabId) ?? { top: 0, pinned: true };
    positions.current.set(tabId, position);
    return trackScrollPosition(element, position);
  }, [tabId, scrollRef]);
}
