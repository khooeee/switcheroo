const MAX_ENTRIES = 100;

/** Browser-style back/forward over selected tabs. `index` leads the active tab while a move is landing. */
export class TabHistory {
  private ids: string[] = [];
  private index = -1;

  /** Note the active tab. A tab reached through `step` is already at `index`; anything else drops forward entries. */
  record(id: string): void {
    if (this.ids[this.index] === id) return;
    this.ids.length = this.index + 1;
    this.ids.push(id);
    if (this.ids.length > MAX_ENTRIES) this.ids.shift();
    this.index = this.ids.length - 1;
  }

  /** Nearest entry in the `delta` direction that's still `visible`, or null. Ignored until the last move lands. */
  step(delta: 1 | -1, activeId: string | null, visible: string[]): string | null {
    if (this.ids[this.index] !== activeId) return null;
    for (let i = this.index + delta; i >= 0 && i < this.ids.length; i += delta) {
      const id = this.ids[i];
      if (id === undefined || id === activeId || !visible.includes(id)) continue;
      this.index = i;
      return id;
    }
    return null;
  }
}
