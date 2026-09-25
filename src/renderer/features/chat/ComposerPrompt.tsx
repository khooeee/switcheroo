import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent, type RefObject } from "react";
import type { SlashCommand } from "../../../shared/types";
import { applySlashCommand } from "./applySlashCommand";
import { filterSlashCommands } from "./filterSlashCommands";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { slashQuery } from "./slashQuery";

export function ComposerPrompt({
  draft,
  placeholder,
  promptRef,
  commands,
  onDraftChange,
  onKeyDown,
  onPaste,
}: {
  draft: string;
  placeholder: string;
  promptRef: RefObject<HTMLTextAreaElement | null>;
  commands: SlashCommand[];
  onDraftChange: (text: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => boolean;
  onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const query = slashQuery(draft);
  const matches = useMemo(
    () => (query == null ? [] : filterSlashCommands(commands, query)),
    [commands, query],
  );
  const open = !dismissed && matches.length > 0;
  const listRef = useRef(matches);
  listRef.current = matches;

  useEffect(() => {
    setActiveIndex(0);
    setDismissed(false);
  }, [query]);

  const pick = (command: SlashCommand) => {
    const next = applySlashCommand(command);
    onDraftChange(next);
    requestAnimationFrame(() => {
      const el = promptRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.length, next.length);
    });
  };

  return (
    <div className="composer-prompt">
      {open ? (
        <SlashCommandMenu
          commands={matches}
          activeIndex={activeIndex}
          onPick={pick}
        />
      ) : null}
      <textarea
        ref={promptRef}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => onDraftChange(e.target.value)}
        onPaste={onPaste}
        onKeyDown={(e) => {
          if (open) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => (i + 1) % listRef.current.length);
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => (i - 1 + listRef.current.length) % listRef.current.length);
              return;
            }
            if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing)) {
              e.preventDefault();
              const command = listRef.current[activeIndex];
              if (command) pick(command);
              return;
            }
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              setDismissed(true);
              return;
            }
          }
          if (onKeyDown(e)) e.preventDefault();
        }}
      />
    </div>
  );
}
