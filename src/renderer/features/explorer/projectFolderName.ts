/** Last segment of a project path: "/Users/me/code/app" → "app". */
export function projectFolderName(cwd: string): string {
  return cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd;
}
