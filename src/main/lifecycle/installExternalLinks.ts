import { shell, type WebContents } from "electron";

export function installExternalLinks(contents: WebContents): void {
  contents.setWindowOpenHandler(({ url }) => {
    if (/^(https?:|mailto:)/i.test(url)) {
      void shell.openExternal(url).catch(console.error);
    }
    return { action: "deny" };
  });
}
