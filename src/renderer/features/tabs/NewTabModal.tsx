import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { AgentKind } from "../../../shared/types";
import { randomSessionTitle } from "./sessionTitle";

const LAST_AGENT_KEY = "switcheroo.lastAgent";
const LAST_CWD_KEY = "switcheroo.lastCwd";
const LAST_AWARE_KEY = "switcheroo.lastSwitcherooAware";

interface Props {
  onCancel: () => void;
  onCreate: (
    agentKind: AgentKind,
    cwd: string,
    title: string,
    switcherooAware: boolean,
  ) => Promise<void>;
}

function readLastAgent(): AgentKind {
  try {
    const value = localStorage.getItem(LAST_AGENT_KEY);
    if (value === "claude" || value === "codex" || value === "cursor") return value;
  } catch {
    // Storage can be unavailable; fall back to the default agent.
  }
  return "claude";
}

function readLastCwd(): string {
  try {
    return localStorage.getItem(LAST_CWD_KEY) ?? "";
  } catch {
    return "";
  }
}

function readLastAware(): boolean {
  try {
    return localStorage.getItem(LAST_AWARE_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberSession(agentKind: AgentKind, cwd: string, switcherooAware: boolean): void {
  try {
    localStorage.setItem(LAST_AGENT_KEY, agentKind);
    localStorage.setItem(LAST_CWD_KEY, cwd);
    localStorage.setItem(LAST_AWARE_KEY, switcherooAware ? "1" : "0");
  } catch {
    // The session can still be created if the preference cannot be saved.
  }
}

export function NewTabModal({ onCancel, onCreate }: Props) {
  const [agentKind, setAgentKind] = useState<AgentKind>(readLastAgent);
  const [cwd, setCwd] = useState(readLastCwd);
  const [title, setTitle] = useState(randomSessionTitle);
  const [switcherooAware, setSwitcherooAware] = useState(readLastAware);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const input = titleRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  const create = async () => {
    const sessionTitle = title.trim();
    if (!cwd || !sessionTitle || busy) return;
    setBusy(true);
    setError(null);
    rememberSession(agentKind, cwd, switcherooAware);
    try {
      await onCreate(agentKind, cwd, sessionTitle, switcherooAware);
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
      if (event.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const items = [...root.querySelectorAll<HTMLElement>("button, input, select, textarea")].filter(
        (el) => !el.hasAttribute("disabled"),
      );
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = active instanceof HTMLElement && root.contains(active);
      if (event.shiftKey) {
        if (!inside || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        event.preventDefault();
        first.focus();
      }
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
        <h3>New agent session</h3>
        <label>
          Title
          <input
            ref={titleRef}
            value={title}
            disabled={busy}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={createOnEnter}
          />
        </label>
        <label>
          Agent
          <select
            value={agentKind}
            disabled={busy}
            onChange={(e) => setAgentKind(e.target.value as AgentKind)}
            onKeyDown={createOnEnter}
          >
            <option value="claude">Claude Code</option>
            <option value="codex">Codex</option>
            <option value="cursor">Cursor</option>
          </select>
        </label>
        <label>
          Workspace folder
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={cwd}
              disabled={busy}
              onChange={(e) => setCwd(e.target.value)}
              onKeyDown={createOnEnter}
              placeholder="/path/to/project"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={async () => {
                const picked = await window.switcheroo.pickFolder();
                if (picked) setCwd(picked);
              }}
            >
              Browse
            </button>
          </div>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={switcherooAware}
            disabled={busy}
            onChange={(e) => setSwitcherooAware(e.target.checked)}
          />
          Switcheroo aware
        </label>
        {error && <div style={{ color: "var(--danger)" }}>{error}</div>}
        <div className="composer-actions" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!cwd || !title.trim() || busy}
            onClick={() => void create()}
          >
            {busy ? "Starting…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
