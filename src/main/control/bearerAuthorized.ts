export function bearerAuthorized(header: string | undefined, token: string): boolean {
  if (!header) return false;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return !!match && match[1] === token;
}
