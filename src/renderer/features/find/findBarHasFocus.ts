/** True when focus is inside the find bar. */
export function findBarHasFocus(): boolean {
  return !!document.activeElement?.closest(".find-bar");
}
