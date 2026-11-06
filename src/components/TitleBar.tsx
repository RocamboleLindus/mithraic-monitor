import { runWindow } from "../window";

export function TitleBar() {
  return (
    <header className="titlebar">
      <div className="titlebar-drag" data-tauri-drag-region>
        Mithraic HW Monitor
      </div>
      <div className="titlebar-actions">
        <button type="button" className="window-button" aria-label="Minimize" onClick={() => void runWindow("minimize")}>
          &#8211;
        </button>
        <button type="button" className="window-button" aria-label="Maximize" onClick={() => void runWindow("toggleMaximize")}>
          &#9633;
        </button>
        <button type="button" className="window-button close" aria-label="Close" onClick={() => void runWindow("close")}>
          &#10005;
        </button>
      </div>
    </header>
  );
}
