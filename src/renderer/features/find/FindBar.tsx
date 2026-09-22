import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  query: string;
  onQuery: (q: string) => void;
  root: HTMLElement | null;
  onClose: () => void;
}

export function FindBar({ query, onQuery, root, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [index, setIndex] = useState(0);

  const matches = useMemo(() => {
    if (!root || !query.trim()) return [] as HTMLElement[];
    const nodes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-find-text], .message, .feed-item"),
    );
    const q = query.toLowerCase();
    return nodes.filter((n) => {
      const text = (n.dataset.findText ?? n.textContent ?? "").toLowerCase();
      return text.includes(q);
    });
  }, [root, query]);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  useEffect(() => {
    if (matches.length === 0) return;
    const el = matches[Math.min(index, matches.length - 1)];
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [index, matches]);

  const go = (dir: 1 | -1) => {
    if (matches.length === 0) return;
    setIndex((i) => (i + dir + matches.length) % matches.length);
  };

  return (
    <div className="find-bar" role="search">
      <input
        ref={inputRef}
        value={query}
        placeholder="Find in tab…"
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Enter") {
            e.preventDefault();
            go(e.shiftKey ? -1 : 1);
          }
        }}
      />
      <span className="find-count">
        {query.trim()
          ? matches.length
            ? `${Math.min(index + 1, matches.length)}/${matches.length}`
            : "0/0"
          : ""}
      </span>
      <button type="button" className="btn" onClick={() => go(-1)}>
        ↑
      </button>
      <button type="button" className="btn" onClick={() => go(1)}>
        ↓
      </button>
      <button type="button" className="btn" onClick={onClose}>
        ✕
      </button>
    </div>
  );
}
