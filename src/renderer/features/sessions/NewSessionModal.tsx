import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { AgentKind } from "../../../shared/types";
import { trapModalTabFocus } from "../modals/trapModalTabFocus";
import { getAppSettingsCache, patchAppSettings } from "../settings/appSettingsCache";
import { randomSessionTitle } from "./sessionTitle";
import { useAvailableAgents } from "./useAvailableAgents";
import "../modals/modal.css";

const AGENT_OPTIONS: Array<{ kind: AgentKind; label: string }> = [
  { kind: "claude", label: "Claude Code" },
  { kind: "codex", label: "Codex" },
  { kind: "cursor", label: "Cursor" },
  { kind: "pi", label: "Pi" },
];

interface Props {
  onCancel: () => void;
  canPin: boolean;
  onCreate: (
    agent: AgentKind,
    cwd: string,
    title: string,
    switcherooAware: boolean,
    pin: boolean,
  ) => Promise<void>;
}

export function NewSessionModal({ onCancel, canPin, onCreate }: Props) {
  const prefs = getAppSettingsCache();
  const [agent, setAgent] = useState<AgentKind>(prefs.lastAgent);
  const [cwd, setCwd] = useState(prefs.lastCwd);
  const [prefix, setPrefix] = useState(prefs.lastPrefix);
  const [title, setTitle] = useState(randomSessionTitle);
  const [pin, setPin] = useState(prefs.lastPin);
  const [switcherooAware, setSwitcherooAware] = useState(prefs.lastSwitcherooAware);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const available = useAvailableAgents();
  const agentOptions = AGENT_OPTIONS.filter(
    (option) => available === null || available.includes(option.kind),
  );
  // Fall back when the remembered agent is no longer installed.
  const selectedAgent = agentOptions.some((option) => option.kind === agent)
    ? agent
    : agentOptions[0]?.kind;

  useEffect(() => {
    const input = titleRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  const create = async () => {
    const trimmedTitle = title.trim();
    if (!selectedAgent || !cwd || !trimmedTitle || busy) return;
    const sessionTitle = prefix !== "" ? `${prefix} ${trimmedTitle}` : trimmedTitle;
    setBusy(true);
    setError(null);
    void patchAppSettings({
      lastAgent: selectedAgent,
      lastCwd: cwd,
      lastPrefix: prefix,
      lastPin: pin,
      lastSwitcherooAware: switcherooAware,
    });
    try {
      await onCreate(selectedAgent, cwd, sessionTitle, switcherooAware, canPin && pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  const createOnEnter = (event: ReactKeyboardEvent) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void create();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (busy) return;
        event.preventDefault();
        onCancel();
        return;
      }
      const root = dialogRef.current;
      if (root) trapModalTabFocus(event, root);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, busy]);

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div ref={dialogRef} className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>New agent session</h2>
        <label>
          Prefix
          <input
            value={prefix}
            disabled={busy}
            onChange={(e) => setPrefix(e.target.value)}
            onKeyDown={createOnEnter}
            spellCheck={false}
          />
        </label>
        <label>
          Title
          <input
            ref={titleRef}
            value={title}
            disabled={busy}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={createOnEnter}
            spellCheck={false}
          />
        </label>
        <label>
          Agent
          <select
            value={selectedAgent ?? ""}
            disabled={busy || !selectedAgent}
            onChange={(e) => setAgent(e.target.value as AgentKind)}
            onKeyDown={createOnEnter}
          >
            {agentOptions.map((option) => (
              <option key={option.kind} value={option.kind}>
                {option.label}
              </option>
            ))}
            {!selectedAgent && <option value="">No ACP agents installed</option>}
          </select>
        </label>
        <label>
          Folder
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={cwd}
              disabled={busy}
              onChange={(e) => setCwd(e.target.value)}
              onKeyDown={createOnEnter}
              placeholder="/path/to/project"
              spellCheck={false}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={async () => {
                const picked = await window.switcheroo.pickFolder(cwd);
                if (picked) setCwd(picked);
              }}
            >
              Browse
            </button>
          </div>
        </label>
        <div className="modal-checks">
          <label className="modal-check">
            <input
              type="checkbox"
              checked={canPin && pin}
              disabled={busy || !canPin}
              onChange={(e) => setPin(e.target.checked)}
              onKeyDown={createOnEnter}
            />
            Pin
          </label>
          <label className="modal-check">
            <input
              type="checkbox"
              checked={switcherooAware}
              disabled={busy}
              onChange={(e) => setSwitcherooAware(e.target.checked)}
              onKeyDown={createOnEnter}
            />
            Switcheroo aware
          </label>
        </div>
        {error && <div style={{ color: "var(--danger)" }}>{error}</div>}
        <div className="composer-actions" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!selectedAgent || !cwd || !title.trim() || busy}
            onClick={() => void create()}
          >
            {busy ? "Starting…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
