/** Visible UI panes that can own keyboard focus. */
export type FocusPane = "prompt" | "transcript" | "details";

const PANE_EVENT = "switcheroo:focus-pane";

/** Ask a pane to take keyboard focus (transcript selection, details event, or prompt). */
export function requestFocusPane(pane: FocusPane): void {
  window.dispatchEvent(new CustomEvent(PANE_EVENT, { detail: pane }));
  if (pane === "prompt") {
    window.dispatchEvent(new CustomEvent("switcheroo:focus-prompt"));
  }
}

export function subscribeFocusPane(cb: (pane: FocusPane) => void): () => void {
  const onPane = (event: Event) => {
    cb((event as CustomEvent<FocusPane>).detail);
  };
  window.addEventListener(PANE_EVENT, onPane);
  return () => window.removeEventListener(PANE_EVENT, onPane);
}
