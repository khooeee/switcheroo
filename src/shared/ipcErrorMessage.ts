import { errorMessage } from "./errorMessage";

/** Remove Electron's remote-method wrapper from an error shown in the UI. */
export function ipcErrorMessage(error: unknown): string {
  return errorMessage(error).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
}
