import { useEffect, useLayoutEffect, useRef } from "react";
import { openSearchPanel } from "@codemirror/search";
import { EditorView } from "@codemirror/view";
import { explorerStore } from "../explorer/explorerStore";
import type { LiveText } from "./FileBuffer";
import { fileBufferStore } from "./fileBufferStore";
import { fileScrollMemory } from "./fileScrollMemory";

interface Props {
  sessionId: string;
  path: string;
  live: LiveText;
}

function topPosition(view: EditorView): number {
  return view.lineBlockAtHeight(view.scrollDOM.scrollTop).from;
}

function scrollToPosition(view: EditorView, pos: number): void {
  const at = Math.min(pos, view.state.doc.length);
  view.dispatch({ effects: EditorView.scrollIntoView(at, { y: "start", yMargin: 0 }) });
}

/**
 * One CodeMirror view shared by every text tab: switching files swaps in that file's state,
 * so each keeps its own undo history, selection and scroll position.
 * The parent re-renders on every buffer change, which is when a reload swaps `live.state`.
 */
export function CodeEditor({ sessionId, path, live }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const shown = useRef({ sessionId, path, live });

  // Created once; the effect below swaps files into it.
  useLayoutEffect(() => {
    const view = new EditorView({
      parent: hostRef.current!,
      state: shown.current.live.state,
      dispatchTransactions: (transactions, editor) => {
        editor.update(transactions);
        fileBufferStore.noteEdit(shown.current.sessionId, shown.current.path, editor.state);
        // Editing a previewed file keeps its tab.
        if (transactions.some((tr) => tr.docChanged)) {
          explorerStore.pinFile(shown.current.sessionId, shown.current.path);
        }
      },
    });
    viewRef.current = view;
    scrollToPosition(view, fileScrollMemory.get(shown.current.sessionId, shown.current.path) ?? 0);
    const onScroll = () => {
      fileScrollMemory.set(shown.current.sessionId, shown.current.path, topPosition(view));
    };
    view.scrollDOM.addEventListener("scroll", onScroll, { passive: true });
    view.focus();
    return () => {
      view.scrollDOM.removeEventListener("scroll", onScroll);
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const prev = shown.current;
    const sameFile = prev.sessionId === sessionId && prev.path === path;
    shown.current = { sessionId, path, live };
    if (sameFile && view.state === live.state) return;
    // Same file with a new state is a reload from disk: keep the reader where they were.
    const top = sameFile ? topPosition(view) : fileScrollMemory.get(sessionId, path) ?? 0;
    view.setState(live.state);
    scrollToPosition(view, top);
    if (!sameFile) view.focus();
  });

  useEffect(() => {
    const onFind = () => {
      const view = viewRef.current;
      if (!view) return;
      view.focus();
      openSearchPanel(view);
    };
    window.addEventListener("switcheroo:find-in-file", onFind);
    return () => window.removeEventListener("switcheroo:find-in-file", onFind);
  }, []);

  return <div ref={hostRef} className="code-editor" />;
}
