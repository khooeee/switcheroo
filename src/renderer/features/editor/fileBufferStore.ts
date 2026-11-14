import { EditorState, type Extension } from "@codemirror/state";
import type { FileContent } from "../../../shared/fileContent";
import { errorMessage } from "../../../shared/errorMessage";
import { editorExtensions } from "./editorExtensions";
import type { FileBuffer } from "./FileBuffer";
import { languageFor } from "./languageFor";
import { docReplacement } from "./docReplacement";

type TextBuffer = Extract<FileBuffer, { kind: "text" }>;

const LOADING: FileBuffer = { kind: "loading" };
const buffers = new Map<string, FileBuffer>();
const saving = new Set<string>();
const listeners = new Set<() => void>();

const keyOf = (sessionId: string, path: string) => `${sessionId}\0${path}`;

function put(key: string, buffer: FileBuffer): void {
  buffers.set(key, buffer);
  listeners.forEach((listener) => listener());
}

function textAt(key: string): TextBuffer | null {
  const buffer = buffers.get(key);
  return buffer?.kind === "text" ? buffer : null;
}

function fromContent(sessionId: string, path: string, content: FileContent, language: Extension): FileBuffer {
  switch (content.kind) {
    case "text": {
      const crlf = content.text.includes("\r\n");
      const state = EditorState.create({
        doc: content.text,
        extensions: editorExtensions(language, crlf, () => void fileBufferStore.save(sessionId, path)),
      });
      return { kind: "text", live: { state, saved: state.doc }, mtimeMs: content.mtimeMs, dirty: false, conflictMtimeMs: null };
    }
    case "image":
      return { kind: "image", dataUrl: content.dataUrl };
    case "binary":
    case "tooLarge":
      return { kind: content.kind, size: content.size };
    case "missing":
      return { kind: "missing" };
  }
}

/** Open files' contents and editor states, per session and path. */
export const fileBufferStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  get(sessionId: string, path: string): FileBuffer | undefined {
    return buffers.get(keyOf(sessionId, path));
  },

  /** Read a file (and its grammar) unless it is already open. */
  async load(sessionId: string, path: string): Promise<void> {
    const key = keyOf(sessionId, path);
    if (buffers.has(key)) return;
    put(key, LOADING);
    try {
      const [content, language] = await Promise.all([
        window.switcheroo.readSessionFile(sessionId, path),
        languageFor(path),
      ]);
      if (buffers.get(key) === LOADING) put(key, fromContent(sessionId, path, content, language));
    } catch (err) {
      if (buffers.get(key) === LOADING) put(key, { kind: "error", message: errorMessage(err) });
    }
  },

  /** The editor applied a change; notifies only when the dirty flag flips. */
  noteEdit(sessionId: string, path: string, state: EditorState): void {
    const key = keyOf(sessionId, path);
    const buffer = textAt(key);
    if (!buffer) return;
    buffer.live.state = state;
    const dirty = !state.doc.eq(buffer.live.saved);
    if (dirty !== buffer.dirty) put(key, { ...buffer, dirty });
  },

  /** Write the text; `force` overwrites a file that changed on disk. False when nothing was saved. */
  async save(sessionId: string, path: string, force = false): Promise<boolean> {
    const key = keyOf(sessionId, path);
    const buffer = textAt(key);
    if (!buffer || saving.has(key)) return false;
    if (buffer.conflictMtimeMs !== null && !force) return false;
    saving.add(key);
    const doc = buffer.live.state.doc;
    try {
      const text = buffer.live.state.sliceDoc();
      const result = await window.switcheroo.writeSessionFile(sessionId, path, text, force ? null : buffer.mtimeMs);
      const current = textAt(key);
      if (!current) return result.ok;
      if (!result.ok) {
        put(key, { ...current, conflictMtimeMs: result.mtimeMs });
        return false;
      }
      current.live.saved = doc;
      put(key, { ...current, mtimeMs: result.mtimeMs, conflictMtimeMs: null, dirty: !current.live.state.doc.eq(doc) });
      return true;
    } catch (err) {
      console.error(`[editor] save ${path} failed:`, errorMessage(err));
      return false;
    } finally {
      saving.delete(key);
    }
  },

  /**
   * Re-read an open file from disk. Unsaved edits are kept (and flagged as a conflict) unless
   * `discardEdits`; otherwise the new text replaces the old as one undoable change.
   */
  async reload(sessionId: string, path: string, discardEdits = false): Promise<void> {
    const key = keyOf(sessionId, path);
    const before = buffers.get(key);
    if (!before || before.kind === "loading") return;
    const content = await window.switcheroo.readSessionFile(sessionId, path).catch(
      (err: unknown): FileContent | Error => new Error(errorMessage(err)),
    );
    const buffer = buffers.get(key);
    if (!buffer || buffer.kind === "loading") return;
    if (content instanceof Error) return;
    if (buffer.kind !== "text" || content.kind !== "text") {
      if (buffer.kind === "text" && buffer.dirty && !discardEdits) {
        put(key, { ...buffer, conflictMtimeMs: "mtimeMs" in content ? content.mtimeMs : buffer.mtimeMs });
      }
      else put(key, fromContent(sessionId, path, content, await languageFor(path)));
      return;
    }
    if (content.mtimeMs === buffer.mtimeMs && !discardEdits) return;
    if (buffer.dirty && !discardEdits) {
      if (buffer.conflictMtimeMs !== content.mtimeMs) put(key, { ...buffer, conflictMtimeMs: content.mtimeMs });
      return;
    }
    const state = buffer.live.state;
    const next = state.update({ changes: docReplacement(state, content.text) }).state;
    buffer.live.state = next;
    buffer.live.saved = next.doc;
    put(key, { ...buffer, mtimeMs: content.mtimeMs, dirty: false, conflictMtimeMs: null });
  },

  /** Keep the unsaved edits; the next save overwrites the disk version that caused the conflict. */
  keepMine(sessionId: string, path: string): void {
    const key = keyOf(sessionId, path);
    const buffer = textAt(key);
    if (buffer?.conflictMtimeMs == null) return;
    put(key, { ...buffer, mtimeMs: buffer.conflictMtimeMs, conflictMtimeMs: null });
  },

  /** Forget a closed tab's buffer. */
  drop(sessionId: string, path: string): void {
    if (buffers.delete(keyOf(sessionId, path))) listeners.forEach((listener) => listener());
  },

  isDirty(sessionId: string, path: string): boolean {
    return textAt(keyOf(sessionId, path))?.dirty ?? false;
  },

  /** Every open file with unsaved edits, as session id and path. */
  dirtyFiles(): Array<{ sessionId: string; path: string }> {
    const dirty: Array<{ sessionId: string; path: string }> = [];
    for (const [key, buffer] of buffers) {
      if (buffer.kind !== "text" || !buffer.dirty) continue;
      const [sessionId, path] = key.split("\0");
      dirty.push({ sessionId, path });
    }
    return dirty;
  },
};
