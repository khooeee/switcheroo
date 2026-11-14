import { useCallback, useSyncExternalStore } from "react";
import type { FileBuffer } from "./FileBuffer";
import { fileBufferStore } from "./fileBufferStore";

export function useFileBuffer(sessionId: string, path: string): FileBuffer | undefined {
  const getSnapshot = useCallback(() => fileBufferStore.get(sessionId, path), [sessionId, path]);
  return useSyncExternalStore(fileBufferStore.subscribe, getSnapshot);
}
