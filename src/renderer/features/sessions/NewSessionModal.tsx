import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { AgentKind } from "../../../shared/agentKind";
import { AGENT_LABELS } from "../../../shared/agentLabels";
import type { CreateSessionInput } from "../../../shared/createSessionInput";
import { errorMessage } from "../../../shared/errorMessage";
import { sessionTitleWithPrefix } from "../../../shared/sessionTitleWithPrefix";
import { supportsSwitcherooAware } from "../../../shared/supportsSwitcherooAware";
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
  const [prefix, setPrefix] = useState(prefs.lastPrefix);
  const [placeholderTitle] = useState(randomSessionTitle);
  const [title, setTitle] = useState(placeholderTitle);
  const [pin, setPin] = useState(prefs.lastPin);
  const [switcherooAware, setSwitcherooAware] = useState(prefs.lastSwitcherooAware);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const available = useAvailableAgents();
  const agentOptions = AGENT_KINDS.filter((kind) => available === null || available.includes(kind));
  // Fall back when the remembered agent is no longer installed.
  const selectedAgent = agentOptions.includes(agent) ? agent : agentOptions[0];
  const canBeAware = supportsSwitcherooAware(selectedAgent);
  const canCreate = !!selectedAgent && !!cwd && !!(prefix.trim() || title.trim()) && !busy;

  useEffect(() => {
    const input = titleRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  const create = async () => {
    if (!canCreate) return;
    const sessionTitle = sessionTitleWithPrefix(prefix, title);
    // A kept placeholder (or no name) is replaced by the agent's title after the first prompt.
    const autoTitle = !title.trim() || title === placeholderTitle ? { prefix } : undefined;
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
      await onCreate({
        agent: selectedAgent,
        cwd,
        title: sessionTitle,
        switcherooAware: canBeAware && switcherooAware,
        pin,
        autoTitle,
      });
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
          Prefix
          <textarea
            value={prefix}
            rows={2}
            disabled={busy}
            onChange={(e) => setPrefix(e.target.value)}
            onKeyDown={createOnEnter}
            spellCheck={false}
          />
        </label>
        <label>
          Title
          <textarea
            ref={titleRef}
            value={title}
            rows={2}
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
          <label className="modal-check" data-tooltip={canBeAware ? undefined : "Claude and Codex only"}>
            <input
              type="checkbox"
              checked={canBeAware && switcherooAware}
              disabled={busy || !canBeAware}
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
