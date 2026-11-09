import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { AgentKind } from "../../../shared/agentKind";
import { AGENT_LABELS } from "../../../shared/agentLabels";
import type { CreateSessionInput } from "../../../shared/createSessionInput";
import { errorMessage } from "../../../shared/errorMessage";
import { generatesSessionTitles } from "../../../shared/generatesSessionTitles";
import { trapModalTabFocus } from "../modals/trapModalTabFocus";
import { getAppSettingsCache, patchAppSettings } from "../settings/appSettingsCache";
import { randomSessionTitle } from "./sessionTitle";
import { useAvailableAgents } from "./useAvailableAgents";
import "../modals/modal.css";

const AGENT_KINDS = Object.keys(AGENT_LABELS) as AgentKind[];

interface Props {
  onCancel: () => void;
  onCreate: (input: CreateSessionInput) => Promise<void>;
}

export function NewSessionModal({ onCancel, onCreate }: Props) {
  const prefs = getAppSettingsCache();
  const [agent, setAgent] = useState<AgentKind>(prefs.lastAgent);
  const [cwd, setCwd] = useState(prefs.lastCwd);
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState(randomSessionTitle);
  const [pin, setPin] = useState(prefs.lastPin);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const available = useAvailableAgents();
  const agentOptions = AGENT_KINDS.filter((kind) => available === null || available.includes(kind));
  // Fall back when the remembered agent is no longer installed.
  const selectedAgent = agentOptions.includes(agent) ? agent : agentOptions[0];
  // Agents that title themselves get the first prompt; the rest (pi) a title.
  const asksPrompt = generatesSessionTitles(selectedAgent);
  const canCreate = !!selectedAgent && !!cwd && (asksPrompt || !!title.trim()) && !busy;

  useEffect(() => {
    const input = fieldRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  const create = async () => {
    if (!canCreate) return;
    const named = asksPrompt
      ? { prompt: prompt.trim() || undefined, autoTitle: true }
      : { title: title.trim() };
    setBusy(true);
    setError(null);
    void patchAppSettings({
      lastAgent: selectedAgent,
      lastCwd: cwd,
      lastPin: pin,
    });
    try {
      await onCreate({ agent: selectedAgent, cwd, pin, ...named });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const createOnEnter = (event: ReactKeyboardEvent) => {
    if (event.key !== "Enter" || event.shiftKey) return;
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
          Agent
          <select
            value={selectedAgent ?? ""}
            disabled={busy || !selectedAgent}
            onChange={(e) => setAgent(e.target.value as AgentKind)}
            onKeyDown={createOnEnter}
          >
            {agentOptions.map((kind) => (
              <option key={kind} value={kind}>
                {AGENT_LABELS[kind]}
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
        <label>
          {asksPrompt ? "Prompt" : "Title"}
          <textarea
            ref={fieldRef}
            value={asksPrompt ? prompt : title}
            rows={asksPrompt ? 4 : 2}
            disabled={busy}
            onChange={(e) => (asksPrompt ? setPrompt : setTitle)(e.target.value)}
            onKeyDown={createOnEnter}
            placeholder={asksPrompt ? "The agent names the session from it" : undefined}
            spellCheck={false}
          />
        </label>
        <div className="modal-checks">
          <label className="modal-check">
            <input
              type="checkbox"
              checked={pin}
              disabled={busy}
              onChange={(e) => setPin(e.target.checked)}
              onKeyDown={createOnEnter}
            />
            Pin
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
            disabled={!canCreate}
            onClick={() => void create()}
          >
            {busy ? "Starting…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
