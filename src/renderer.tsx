import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./renderer/App";
import { applyStoredTheme } from "./renderer/features/theme/theme";
import { applyStoredDetails } from "./renderer/features/settings/details";
import { loadAppSettings } from "./renderer/features/settings/appSettingsCache";
import { applyRailWidth, readRailWidth, reclampRailWidth } from "./renderer/features/sessions/railWidth";
import { reclampRightRailWidth } from "./renderer/features/chat/rightRailWidth";
import { composerHeight } from "./renderer/features/chat/composerHeight";
import { installInstantTooltips } from "./renderer/features/tooltip/installInstantTooltips";
import "./renderer/features/theme/theme.css";
import "./renderer/styles.css";

async function boot(): Promise<void> {
  await loadAppSettings();
  applyStoredTheme();
  applyStoredDetails();
  applyRailWidth(readRailWidth());
  composerHeight.apply(composerHeight.read());
  installInstantTooltips();
  window.addEventListener("resize", () => {
    reclampRailWidth();
    reclampRightRailWidth();
  });

  const root = document.getElementById("root");
  if (root) {
    createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  }
}

void boot();
