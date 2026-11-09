/** A session title under its folder's name: "switcheroo\nFix login redirect". */
export function folderTitle(cwd: string, name: string): string {
  const folder = cwd.split(/[\\/]/).filter(Boolean).pop();
  return folder ? `${folder}\n${name.trim()}` : name.trim();
}
