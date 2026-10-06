import { app, dialog } from "electron";

/** Holds every quit until the user confirms (when work is running) and state is saved. */
export function installQuitHandler(
  confirm: () => Promise<boolean>,
  saveAndDispose: () => Promise<void>,
): void {
  let quitting = false;
  let saved = false;

  app.on("before-quit", (event) => {
    if (saved) return;
    event.preventDefault();
    if (quitting) return;
    quitting = true;

    void confirm()
      .then(async (ok) => {
        if (!ok) {
          quitting = false;
          return;
        }
        await saveAndDispose();
        saved = true;
        app.quit();
      })
      .catch((error: unknown) => {
        quitting = false;
        dialog.showErrorBox(
          "Could not save Switcheroo",
          `The app has stayed open so you can retry quitting.\n\n${String(error)}`,
        );
      });
  });
}
