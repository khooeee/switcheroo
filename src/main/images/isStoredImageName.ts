/** Only names storeImage writes, so a name can never reach outside the images dir. */
const IMAGE_NAME = /^[a-f0-9]{64}\.(png|jpg|gif|webp)$/;

export function isStoredImageName(name: string): boolean {
  return IMAGE_NAME.test(name);
}
