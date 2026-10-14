/** One rail context-menu row: runs `onSelect`, then dismisses the menu. */
export function SessionRailMenuItem({
  label,
  shortcut,
  keys,
  disabled,
  onSelect,
  onDismiss,
}: {
  label: string;
  /** Glyph shown at the right edge, e.g. "⌘R". */
  shortcut: string;
  /** `aria-keyshortcuts` value, e.g. "Meta+R Control+R". */
  keys: string;
  disabled?: boolean;
  onSelect: () => void;
  onDismiss: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="context-item"
      disabled={disabled}
      aria-keyshortcuts={keys}
      onClick={() => {
        if (disabled) return;
        onSelect();
        onDismiss();
      }}
    >
      {label}
      <kbd className="settings-shortcut">{shortcut}</kbd>
    </button>
  );
}
