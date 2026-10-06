import "./subagents.css";

/** Spinner while a subagent runs, then ✓ / ✕ / – for completed, failed, or stopped. */
export function SubagentStateIcon({ state }: { state?: string }) {
  if (state === "running") return <span className="subagent-spinner" aria-hidden="true" />;
  const glyph = state === "completed" ? "✓" : state === "failed" ? "✕" : "–";
  return <span className={`subagent-state-glyph ${state ?? "unknown"}`} aria-hidden="true">{glyph}</span>;
}
