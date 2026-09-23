import { useEffect, useRef, useState, type PointerEvent } from "react";
import { composerHeight } from "./composerHeight";
import "./composerResize.css";

export function ComposerResize() {
  const [height, setHeight] = useState(() =>
    Number.parseFloat(document.documentElement.style.getPropertyValue("--composer-input-height")) || 72,
  );
  const drag = useRef<{ y: number; height: number; cursor: string; select: string } | null>(null);
  const currentHeight = useRef(height);

  const stop = () => {
    if (!drag.current) return;
    composerHeight.apply(currentHeight.current, true);
    document.body.style.cursor = drag.current.cursor;
    document.body.style.userSelect = drag.current.select;
    drag.current = null;
  };
  useEffect(() => stop, []);

  const apply = (handle: HTMLElement, requested: number, persist = false) => {
    const input = handle.parentElement?.querySelector("textarea");
    const scroll = handle.closest(".panel")?.querySelector(".scroll");
    if (!input || !scroll) return;
    const maximum = Math.max(72, input.getBoundingClientRect().height + scroll.clientHeight - 100);
    const next = Math.round(Math.max(72, Math.min(maximum, requested)));
    composerHeight.apply(next, persist);
    currentHeight.current = next;
    setHeight(next);
  };

  const start = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const input = event.currentTarget.parentElement?.querySelector("textarea");
    if (!input) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      y: event.clientY,
      height: input.getBoundingClientRect().height,
      cursor: document.body.style.cursor,
      select: document.body.style.userSelect,
    };
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div
      className="composer-resize"
      role="separator"
      aria-label="Resize prompt area"
      aria-orientation="horizontal"
      aria-valuemin={72}
      aria-valuenow={height}
      tabIndex={0}
      onPointerDown={start}
      onPointerMove={(event) => {
        if (drag.current) apply(event.currentTarget, drag.current.height + drag.current.y - event.clientY);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onKeyDown={(event) => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        const current = event.currentTarget.parentElement?.querySelector("textarea")?.getBoundingClientRect().height ?? height;
        apply(event.currentTarget, current + (event.key === "ArrowUp" ? 24 : -24), true);
      }}
    />
  );
}
