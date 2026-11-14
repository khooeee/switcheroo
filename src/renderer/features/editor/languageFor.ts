import { LanguageDescription } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import type { Extension } from "@codemirror/state";

/** Syntax support for a file by name (each grammar loads on first use); none when unknown. */
export async function languageFor(path: string): Promise<Extension> {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const description = LanguageDescription.matchFilename(languages, name);
  if (!description) return [];
  try {
    return await description.load();
  } catch {
    return [];
  }
}
