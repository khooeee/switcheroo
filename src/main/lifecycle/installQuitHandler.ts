import { app, dialog } from "electron";

/** Holds every quit until the user confirms (when work is running) and state is saved. */
export function installQuitHandler(
  confirm: () => Promise<boolean>,
  saveAndDispose: () => Promise<void>,
): void {
  let quitting = false;
  let saved = false;

  // Closing the window quits the app. Hold it open so the prompt shows over it and Cancel keeps it.
  app.on("browser-window-created", (_event, win) => {
    win.on("close", (event) => {
      if (saved) return;
      event.preventDefault();
      app.quit();
    });
  });

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
