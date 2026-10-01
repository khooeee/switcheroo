import { app, dialog } from "electron";

export function installQuitHandler(saveAndDispose: () => Promise<void>): void {
  let quitting = false;
  let saved = false;

  app.on("before-quit", (event) => {
    if (saved) return;
    event.preventDefault();
    if (quitting) return;
    quitting = true;

    void saveAndDispose().then(
      () => {
        saved = true;
        app.quit();
      },
      (error: unknown) => {
        quitting = false;
        dialog.showErrorBox(
          "Could not save Switcheroo",
          `The app has stayed open so you can retry quitting.\n\n${String(error)}`,
        );
      },
    );
  });
}
