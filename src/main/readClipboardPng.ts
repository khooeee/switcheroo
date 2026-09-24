import { clipboard } from "electron";

export function readClipboardPng(): Buffer | null {
  const image = clipboard.readImage();
  if (image.isEmpty()) return null;
  return image.toPNG();
}
