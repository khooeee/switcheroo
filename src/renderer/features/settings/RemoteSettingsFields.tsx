import { useCallback, useEffect, useState } from "react";
import type { RemoteStatus } from "../../../shared/remoteStatus";
import { useCopiedFlash } from "../copy/useCopiedFlash";
import { CommandBox } from "./CommandBox";
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
  const [rotating, setRotating] = useState(false);
  const [linkCopied, copyLink] = useCopiedFlash();
  const [pasteHint, setPasteHint] = useState(false);

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

  const rotateToken = async () => {
    const ok = window.confirm(
      "Rotate the token? The iOS app will need the new link.\n\nSwitcheroo-aware agents pick it up from control.json.",
    );
    if (!ok) return;
    setRotating(true);
    try {
      setStatus(await window.switcheroo.rotateControlToken());
    } finally {
      setRotating(false);
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
      {status?.serveCommand && !status.servedUrl && (
        <div className="settings-note">
          Run once in a terminal:
          <CommandBox command={status.serveCommand} />
        </div>
      )}
      {status?.servedUrl && status.unserveCommand && (
        <div className="settings-note">
          Served at {status.servedUrl}. To stop:
          <CommandBox command={status.unserveCommand} />
        </div>
      )}
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
      <label>
        Token
        <input type="text" readOnly value={status?.token ?? ""} onFocus={(e) => e.target.select()} />
      </label>
      <div className="settings-note">
        <button type="button" className="btn" disabled={busy || rotating} onClick={() => void rotateToken()}>
          {rotating ? "Rotating…" : "Rotate Token"}
        </button>
      </div>
      {status?.error && <div className="settings-warning">{status.error}</div>}
      {status?.link && (
        <div className="settings-note">
          <button
            type="button"
            className="btn"
            onClick={() => {
              copyLink(status.link!);
              setPasteHint(true);
            }}
          >
            {linkCopied ? "Copied" : "Copy iOS Link"}
          </button>
          {pasteHint && " Paste the link into the iOS app."}
        </div>
      )}
    </>
  );
}
