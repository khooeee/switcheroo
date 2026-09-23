import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./renderer/App";
import { applyStoredTheme } from "./renderer/features/theme/theme";
import { applyStoredDetails } from "./renderer/features/settings/details";
import { applyRailWidth, readRailWidth } from "./renderer/features/tabs/railWidth";
import { composerHeight } from "./renderer/features/chat/composerHeight";
import "./renderer/styles.css";

applyStoredTheme();
applyStoredDetails();
applyRailWidth(readRailWidth());
composerHeight.apply(composerHeight.read());

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
