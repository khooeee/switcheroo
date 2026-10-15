const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

/** File extension for a supported image MIME type, or undefined. */
export function imageExtension(mimeType: string): string | undefined {
  return EXTENSIONS[mimeType.toLowerCase()];
}
