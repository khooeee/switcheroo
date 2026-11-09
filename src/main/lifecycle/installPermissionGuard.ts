import type { Session } from "electron";

/** Only what the app uses: the mic for voice, and writing text to the clipboard (copy buttons). */
function allowed(permission: string, mediaTypes: readonly string[] = []): boolean {
  if (permission === "clipboard-sanitized-write") return true;
  return permission === "media" && mediaTypes.length > 0 && mediaTypes.every((type) => type === "audio");
}

/** Deny every web permission (camera, location, notifications, …) the app does not need; Electron grants all by default. */
export function installPermissionGuard(session: Session): void {
  session.setPermissionRequestHandler((_contents, permission, callback, details) => {
    callback(allowed(permission, "mediaTypes" in details ? details.mediaTypes : undefined));
  });
  session.setPermissionCheckHandler((_contents, permission, _origin, details) =>
    allowed(permission, details.mediaType ? [details.mediaType] : undefined),
  );
}
