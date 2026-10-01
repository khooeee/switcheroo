import type { FileChange } from "./types";

const verbs = {
  created: ["Create", "Created"],
  updated: ["Update", "Updated"],
  deleted: ["Delete", "Deleted"],
  moved: ["Move", "Moved"],
};

export function fileChangeLabel(change: FileChange, status?: string): string {
  const [action, completed] = verbs[change.kind];
  if (status === "completed") return `${completed} ${change.path}`;
  const suffix = status === "in_progress" ? "in progress" : status ?? "reported";
  return `${action} ${change.path} (${suffix})`;
}
