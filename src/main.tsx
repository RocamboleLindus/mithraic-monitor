import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { applyAppearance, loadSettings } from "./settings";
import "./styles.css";

const initial = loadSettings();
applyAppearance(initial.theme, initial.accent);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
