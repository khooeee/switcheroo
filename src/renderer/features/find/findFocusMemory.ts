const focusedTabs = new Set<string>();

/** Whether each tab's find bar had focus when last unmounted, so switching back restores it (like Chrome). */
export const findFocusMemory = {
  set(tab: string, hadFocus: boolean): void {
    if (hadFocus) focusedTabs.add(tab);
    else focusedTabs.delete(tab);
  },

  has(tab: string): boolean {
    return focusedTabs.has(tab);
  },
};
