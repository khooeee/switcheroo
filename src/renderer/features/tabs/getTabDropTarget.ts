interface TabRow {
  id: string;
  top: number;
  height: number;
}

export function getTabDropTarget(rows: TabRow[], draggedId: string, pointerY: number) {
  const remaining = rows.filter((row) => row.id !== draggedId);
  const index = remaining.findIndex((row) => pointerY < row.top + row.height / 2);
  const insertion = index < 0 ? remaining.length : index;
  const order = remaining.map((row) => row.id);
  order.splice(insertion, 0, draggedId);
  return { order, beforeId: remaining[insertion]?.id ?? null };
}
