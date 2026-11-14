/** The Go to File picker is showing. */
export function goToFileOpen(): boolean {
  return document.querySelector("dialog.go-to-file[open]") !== null;
}
