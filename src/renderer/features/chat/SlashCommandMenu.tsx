import { useEffect, useRef } from "react";
import type { SlashCommand } from "../../../shared/types";
import "./slashCommandMenu.css";

export function SlashCommandMenu({
  commands,
  activeIndex,
  onPick,
}: {
  commands: SlashCommand[];
  activeIndex: number;
  onPick: (command: SlashCommand) => void;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (commands.length === 0) return null;
  return (
    <ul className="slash-command-menu" role="listbox" aria-label="Slash commands">
      {commands.map((command, index) => {
        const name = command.name.startsWith("/") ? command.name : `/${command.name}`;
        const active = index === activeIndex;
        return (
          <li key={name}>
            <button
              ref={active ? activeRef : undefined}
              type="button"
              role="option"
              aria-selected={active}
              className={`slash-command-item${active ? " active" : ""}`}
              onMouseDown={(event) => {
                event.preventDefault();
                onPick(command);
              }}
            >
              <span className="slash-command-name">{name}</span>
              <span className="slash-command-description">{command.description}</span>
              {command.hint ? <span className="slash-command-hint">{command.hint}</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
