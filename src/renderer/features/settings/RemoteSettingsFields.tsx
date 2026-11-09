import { useCallback, useEffect, useState } from "react";
import type { RemoteStatus } from "../../../shared/remoteStatus";
import { useCopiedFlash } from "../copy/useCopiedFlash";
import { patchAppSettings } from "./appSettingsCache";
import type { SettingsFieldsProps } from "./SettingsFieldsProps";

/**
 * iOS access: the checkbox applies at once (unlike the rest of the modal) so pairing needs no reopen;
 * the port (shared with Switcheroo-aware agents) applies on Save. Status refreshes on window focus,
 * e.g. after running `tailscale serve`.
 */
export function RemoteSettingsFields({ draft, busy, onChange }: SettingsFieldsProps) {
  const [status, setStatus] = useState<RemoteStatus | null>(null);
  const [applying, setApplying] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [linkCopied, copyLink] = useCopiedFlash();
  const [commandCopied, copyCommand] = useCopiedFlash();

  const refresh = useCallback(() => {
    void window.switcheroo.getRemoteStatus().then(setStatus);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  const toggle = async (remoteEnabled: boolean) => {
    onChange({ remoteEnabled });
    setApplying(true);
    try {
      await patchAppSettings({ remoteEnabled });
    } finally {
      setApplying(false);
      refresh();
    }
  };

  const resetToken = async () => {
    const ok = window.confirm(
      "Reset the token? The iOS app will need the new link.\n\nSwitcheroo-aware agents pick it up from control.json.",
    );
    if (!ok) return;
    setResetting(true);
    try {
      setStatus(await window.switcheroo.resetControlToken());
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <h3 className="settings-section">Remote</h3>
      <label className="modal-check">
        <input
          type="checkbox"
          checked={draft.remoteEnabled}
          disabled={busy || applying}
          onChange={(e) => void toggle(e.target.checked)}
        />
        Allow the iOS app over Tailscale
      </label>
      <label>
        Control API port
        <input
          type="number"
          min={1}
          max={65535}
          value={draft.controlPort}
          disabled={busy}
          onChange={(e) => onChange({ controlPort: e.target.value })}
        />
      </label>
      <div className="settings-note">
        Agents and the iOS app share one token.{" "}
        <button type="button" className="btn" disabled={busy || resetting} onClick={() => void resetToken()}>
          {resetting ? "Resetting…" : "Reset Token"}
        </button>
      </div>
      {status?.error && <div className="settings-warning">{status.error}</div>}
      {status?.serveCommand && !status.served && (
        <div className="settings-note">
          Run once in a terminal: <code>{status.serveCommand}</code>{" "}
          <button type="button" className="btn" onClick={() => copyCommand(status.serveCommand!)}>
            {commandCopied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      {status?.link && (
        <div className="settings-note">
          Paste the link into the iOS app.{" "}
          <button type="button" className="btn" onClick={() => copyLink(status.link!)}>
            {linkCopied ? "Copied" : "Copy iOS Link"}
          </button>
        </div>
      )}
    </>
  );
}
