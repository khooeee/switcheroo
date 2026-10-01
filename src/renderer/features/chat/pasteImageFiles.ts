export function pasteImageFiles(data: DataTransfer | null): File[] {
  if (!data) return [];
  const fromItems = [...data.items]
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => !!file);
  if (fromItems.length) return fromItems;
  return [...data.files].filter((file) => file.type.startsWith("image/"));
}
