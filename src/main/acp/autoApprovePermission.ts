export function autoApprovePermission(
  options: Array<{ optionId: string; kind: string }>,
): string | null {
  const preferred =
    options.find((option) => option.kind === "allow_always") ??
    options.find((option) => option.kind === "allow_once");
  return preferred?.optionId ?? null;
}
