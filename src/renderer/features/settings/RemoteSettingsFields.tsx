import { useEffect, useState } from "react";
import type { RemoteStatus } from "../../../shared/remoteStatus";
import { useCopiedFlash } from "../copy/useCopiedFlash";
import type { SettingsFieldsProps } from "./SettingsFieldsProps";

/** iOS access: enable and port; once serving, the one-time `tailscale serve` command and the pairing link. */
export function RemoteSettingsFields({ draft, busy, onChange }: SettingsFieldsProps) {
  const [status, setStatus] = useState<RemoteStatus | null>(null);
  const [linkCopied, copyLink] = useCopiedFlash();
  const [commandCopied, copyCommand] = useCopiedFlash();

  useEffect(() => {
    void window.switcheroo.getRemoteStatus().then(setStatus);
  }, []);

  const serving = !!status?.serveCommand;
  return (
    <>
      <h3 className="settings-section">Remote</h3>
      <label className="modal-check">
        <input
          type="checkbox"
          checked={draft.remoteEnabled}
          disabled={busy}
          onChange={(e) => onChange({ remoteEnabled: e.target.checked })}
        />
        Allow the iOS app over Tailscale
      </label>
      <label>
        Local port
        <input
          type="number"
          min={1}
          max={65535}
          value={draft.remotePort}
          disabled={busy}
          onChange={(e) => onChange({ remotePort: e.target.value })}
        />
      </label>
      {draft.remoteEnabled && !serving && !status?.error && (
        <div className="settings-note">Save, then reopen Settings to pair the iOS app.</div>
      )}
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
