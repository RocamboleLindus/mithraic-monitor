import { useEffect, useState } from "react";
import { ACCENTS, type AppSettings } from "../settings";
import type { TempUnit } from "../types";

type UpdateStatus = {
  current: string;
  latest: string;
  available: boolean;
  message: string;
};

type SettingsPageProps = {
  settings: AppSettings;
  onChange: (partial: Partial<AppSettings>) => void;
  onReset: () => void;
};

export function SettingsPage({ settings, onChange, onReset }: SettingsPageProps) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [update, setUpdate] = useState<UpdateStatus | null>(null);
  const [updateNote, setUpdateNote] = useState("Checking…");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) {
      setUpdateNote("Updates are available in the installed app.");
      return;
    }
    void (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const status = await invoke<UpdateStatus>("check_for_update");
        setUpdate(status);
        setUpdateNote(status.message);
      } catch (error) {
        setUpdateNote(error instanceof Error ? error.message : "Could not check for updates.");
      }
    })();
  }, []);

  async function reload() {
    setBusy(true);
    setNote("Reloading…");
    if (!("__TAURI_INTERNALS__" in window)) {
      window.location.reload();
      return;
    }
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<string>("reload_app", {
        elevateSensor: settings.elevateSensor,
        elevateApp: settings.elevateApp,
      });
      if (result === "reload-window") window.location.reload();
    } catch (error) {
      setBusy(false);
      setNote(error instanceof Error ? error.message : "Reload failed. Accept the Windows prompt if it is still open.");
    }
  }

  async function installUpdate() {
    if (!("__TAURI_INTERNALS__" in window)) {
      setUpdateNote("Updates are available in the installed app.");
      return;
    }
    setUpdating(true);
    setUpdateNote("Downloading the installer…");
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<string>("install_update");
      if (result !== "installing") setUpdateNote(result);
    } catch (error) {
      setUpdating(false);
      setUpdateNote(error instanceof Error ? error.message : "Update failed.");
    }
  }

  return (
    <section className="page settings-page">
      <header className="page-head">
        <h1>Settings</h1>
        <p>Display, polling, and how the app starts the next time you reload it.</p>
      </header>

      <article className="panel setting-block">
        <h2>Readings</h2>
        <p>These apply immediately and stay on this computer.</p>
        <div className="choice-list">
          <label className="field">
            Poll interval
            <select
              value={settings.intervalMs}
              onChange={(event) => onChange({ intervalMs: Number(event.target.value) })}
            >
              <option value={500}>0.5 seconds</option>
              <option value={1000}>1 second</option>
              <option value={2000}>2 seconds</option>
            </select>
          </label>
          <label className="field">
            Temperature
            <select value={settings.unit} onChange={(event) => onChange({ unit: event.target.value as TempUnit })}>
              <option value="C">Celsius</option>
              <option value="F">Fahrenheit</option>
            </select>
          </label>
        </div>
        <button type="button" className="text-button" onClick={onReset}>
          Reset min / max
        </button>
      </article>

      <article className="panel setting-block">
        <h2>Appearance</h2>
        <p>The accent color is used for the navigation bar, graphs, and highlights.</p>
        <div className="segmented" role="group" aria-label="Theme">
          <button
            type="button"
            className={settings.theme === "dark" ? "selected" : undefined}
            aria-pressed={settings.theme === "dark"}
            onClick={() => onChange({ theme: "dark" })}
          >
            Dark
          </button>
          <button
            type="button"
            className={settings.theme === "light" ? "selected" : undefined}
            aria-pressed={settings.theme === "light"}
            onClick={() => onChange({ theme: "light" })}
          >
            Light
          </button>
        </div>
        <div className="swatches" role="listbox" aria-label="Accent color">
          {ACCENTS.map((accent) => (
            <button
              key={accent.id}
              type="button"
              className={settings.accent === accent.id ? "swatch selected" : "swatch"}
              style={{ background: accent.color }}
              role="option"
              aria-selected={settings.accent === accent.id}
              aria-label={accent.label}
              onClick={() => onChange({ accent: accent.id })}
            />
          ))}
        </div>
      </article>

      <article className="panel setting-block">
        <h2>Reload</h2>
        <p>
          Use this when the usual administrator launch is hard to find. Reload applies whichever boxes are ticked.
          Restart with elevated privileges asks Windows once for the whole app. Launch sensor service as administrator
          asks only for the sensor service, then this window reloads. With neither box ticked, the app restarts normally.
        </p>
        <div className="choice-list">
          <label className="choice">
            <input
              type="checkbox"
              checked={settings.elevateSensor}
              onChange={(event) => onChange({ elevateSensor: event.target.checked })}
            />
            <span>Launch sensor service as administrator</span>
          </label>
          <label className="choice">
            <input
              type="checkbox"
              checked={settings.elevateApp}
              onChange={(event) => onChange({ elevateApp: event.target.checked })}
            />
            <span>Restart with elevated privileges</span>
          </label>
        </div>
        <div className="reload-row">
          <button type="button" className="primary-button" disabled={busy} onClick={() => void reload()}>
            Reload app
          </button>
          {note ? <p className="reload-note">{note}</p> : null}
        </div>
      </article>

      <article className="panel setting-block">
        <h2>Updates</h2>
        <p>Looks at GitHub Releases and installs a newer Windows build when one exists. Nothing is downloaded if you are already on the latest version.</p>
        <div className="reload-row">
          <button
            type="button"
            className="primary-button"
            disabled={updating || !update?.available}
            onClick={() => void installUpdate()}
          >
            Update app
          </button>
          {updateNote ? <p className="reload-note">{updateNote}</p> : null}
        </div>
      </article>
    </section>
  );
}
