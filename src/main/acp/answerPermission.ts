import type * as acp from "@agentclientprotocol/sdk";
import { autoApprovePermission } from "./autoApprovePermission";

/** Auto-approve a permission request when allowed; `note` is the transcript line to show. */
export function answerPermission(
  params: acp.RequestPermissionRequest,
): { note: string; response: acp.RequestPermissionResponse } {
  const title = params.toolCall?.title ?? "Permission requested";
  const optionId = autoApprovePermission(params.options ?? []);
  if (!optionId) return { note: title, response: { outcome: { outcome: "cancelled" } } };
  return { note: `Auto-approved: ${title}`, response: { outcome: { outcome: "selected", optionId } } };
}
