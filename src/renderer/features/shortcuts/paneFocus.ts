/** Ask the prompt to take focus. */
export function requestFocusPane(pane: "prompt"): void {
  if (pane === "prompt") {
    window.dispatchEvent(new CustomEvent("switcheroo:focus-prompt"));
  }
}
