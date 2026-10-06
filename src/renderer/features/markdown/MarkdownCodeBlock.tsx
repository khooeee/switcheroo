import { useRef, type ComponentPropsWithoutRef } from "react";
import type { ExtraProps } from "react-markdown";
import { CheckIcon } from "../copy/CheckIcon";
import { CopyIcon } from "../copy/CopyIcon";
import { useCopiedFlash } from "../copy/useCopiedFlash";
import "../copy/eventActionButton.css";

/** Fenced code block with its own copy icon; copies the rendered code text, not the fence. */
export function MarkdownCodeBlock({ node: _node, ...props }: ComponentPropsWithoutRef<"pre"> & ExtraProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, copy] = useCopiedFlash();
  const label = copied ? "Copied" : "Copy code";

  return (
    <div className="markdown-code-block">
      <pre ref={preRef} {...props} />
      <button
        type="button"
        className={`event-action markdown-code-copy${copied ? " copied" : ""}`}
        aria-label={label}
        data-tooltip={label}
        data-tooltip-align="center"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          copy((preRef.current?.textContent ?? "").replace(/\n$/, ""));
        }}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  );
}
