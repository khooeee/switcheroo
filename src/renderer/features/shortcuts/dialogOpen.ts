/** A modal `<dialog>` is open, so window-level shortcuts should stand down. */
export function dialogOpen(): boolean {
  return document.querySelector("dialog[open]") !== null;
}
