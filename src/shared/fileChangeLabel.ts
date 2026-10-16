import type { FileChange } from "./fileChange";

const verbs = {
  created: ["Create", "Created"],
  updated: ["Update", "Updated"],
  deleted: ["Delete", "Deleted"],
  moved: ["Move", "Moved"],
};

export function fileChangeLabel(change: FileChange, status?: string): string {
  const [action, completed] = verbs[change.kind];
  const target = change.fromPath ? `${change.fromPath} → ${change.path}` : change.path;
  if (status === "completed") return `${completed} ${target}`;
  const suffix = status === "in_progress" ? "in progress" : status ?? "reported";
  return `${action} ${target} (${suffix})`;
}
