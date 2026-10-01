# Code guidelines

My ideal lines of code is under 300 and primarily focused on one idea.  This is so a human engineer can open any file in the repo and have a decent idea what it does within a few seconds.  Extract & refactor to achieve this objective.

Prefer one export per file.

## React.memo stability

Transcript and Switchboard lists rely on `React.memo` so streaming a turn does not re-render every prior node. Keep that working:

- Never pass inline lambdas into memoized list children (`onToggle={() => ...}`, `onOpen={(id) => ...}`). Pass a stable callback and an id, or bind the id inside the memoized child with `useCallback`.
- When updating a turn, replace only what changed. Preserve object identity for unchanged turns, events, and transcript items (structural sharing). Do not deep-clone an entire turn/events array on every stream chunk.
- Prefer `(id) => void` props from parents; let the memoized child close over its own id.
- If you add a new memoized row/card, check its props on every stream update — a new function or array reference each time defeats memo for the whole list.
