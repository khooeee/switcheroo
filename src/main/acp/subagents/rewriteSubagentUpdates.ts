import type * as acp from "@agentclientprotocol/sdk";
import { SUBAGENT_UPDATE_METHOD } from "./subagentUpdateMethod";

const LIFECYCLE = new Set(["subagent_spawned", "subagent_state_update"]);

function isSubagentLifecycle(message: acp.AnyMessage): boolean {
  if (!("method" in message) || message.method !== "session/update") return false;
  const params = message.params as { update?: { sessionUpdate?: unknown } } | undefined;
  return typeof params?.update?.sessionUpdate === "string" && LIFECYCLE.has(params.update.sessionUpdate);
}

/**
 * The SDK validates every session/update against the published schema and drops the draft
 * subagent lifecycle types (RFD #1992). Rename those notifications to a custom method instead.
 */
export function rewriteSubagentUpdates(stream: acp.Stream): acp.Stream {
  return {
    writable: stream.writable,
    readable: stream.readable.pipeThrough(
      new TransformStream<acp.AnyMessage, acp.AnyMessage>({
        transform(message, controller) {
          controller.enqueue(
            isSubagentLifecycle(message) ? { ...message, method: SUBAGENT_UPDATE_METHOD } : message,
          );
        },
      }),
    ),
  };
}
