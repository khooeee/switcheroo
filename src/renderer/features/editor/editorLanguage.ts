import { Compartment } from "@codemirror/state";

/** Holds an editor state's grammar, so Save As under another name can swap it and keep the undo history. */
export const editorLanguage = new Compartment();
