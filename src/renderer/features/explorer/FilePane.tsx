import type { Session } from "../../../shared/session";

/** File Explorer mode's main pane: the active session's open files. */
export function FilePane({ session }: { session: Session | null }) {
  return (
    <section className="panel">
      <div className="empty">
        {session ? "Double-click a file to open it." : "Select a session to browse its files."}
      </div>
    </section>
  );
}
