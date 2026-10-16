import { clipboard } from "electron";

/** Reads the clipboard image as PNG bytes. Chromium exposes TIFF/PNG pasteboard images as image/png. */
export async function readClipboardPng(): Promise<Buffer | null> {
  const items = await clipboard.read();
  const item = items.find((entry) => entry.types.includes("image/png"));
  if (!item) return null;
  const blob = await item.getType("image/png");
  if (blob.size === 0) return null;
  return Buffer.from(await blob.arrayBuffer());
}
