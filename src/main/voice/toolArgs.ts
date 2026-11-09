import { isRecord } from "../../shared/isRecord";

type Args = Record<string, unknown>;

/** Typed reads of a voice tool call's JSON arguments; wrong types read as missing. */
export const toolArgs = {
  parse(raw: string): Args {
    try {
      const value: unknown = JSON.parse(raw || "{}");
      return isRecord(value) ? value : {};
    } catch {
      return {};
    }
  },
  string(args: Args, key: string): string | undefined {
    const value = args[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  },
  number(args: Args, key: string): number | undefined {
    const value = typeof args[key] === "string" ? Number(args[key]) : args[key];
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  },
  boolean(args: Args, key: string): boolean | undefined {
    const value = args[key];
    if (typeof value === "boolean") return value;
    return value === "true" ? true : value === "false" ? false : undefined;
  },
};
