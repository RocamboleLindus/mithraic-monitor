import { useEffect, useRef, useState } from "react";
import { Nav } from "./components/Nav";
import { StatusBar } from "./components/StatusBar";
import { TitleBar } from "./components/TitleBar";
import { FilteredPage, PAGE_FILTERS } from "./pages/FilteredPage";
import { HomePage } from "./pages/HomePage";
import { SensorsPage } from "./pages/SensorsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { applyAppearance, loadSettings, saveSettings, type AppSettings } from "./settings";
import type { PageId } from "./types";
import { useMonitor } from "./useMonitor";

const PAWNIO_RELEASES = "https://github.com/namazso/PawnIO/releases";

export function App() {
  const monitor = useMonitor();
  const [page, setPage] = useState<PageId>("home");
  const [settings, setSettings] = useState(loadSettings);
  const appliedInterval = useRef(false);
  const sensors = monitor.snapshot?.sensors ?? [];
  const pawnMissing = monitor.health != null && !monitor.health.pawnIoInstalled;
  const notElevated = monitor.health != null && !monitor.health.elevated;
  const accessMessage =
    pawnMissing && notElevated
      ? "Install PawnIO and run the sensor service as administrator to fill in the empty CPU, motherboard, and drive readings."
      : pawnMissing
        ? "PawnIO is not installed, so many CPU and motherboard readings stay empty."
        : notElevated
          ? "The sensor service is not running as administrator, so some CPU, motherboard, and drive readings stay empty."
          : null;

  function update(partial: Partial<AppSettings>) {
    setSettings((current) => {
      const next = { ...current, ...partial };
      saveSettings(next);
      if (partial.theme !== undefined || partial.accent !== undefined) {
        applyAppearance(next.theme, next.accent);
      }
      return next;
    });
    if (partial.intervalMs !== undefined) void monitor.setIntervalMs(partial.intervalMs);
  }

  useEffect(() => {
    if (!monitor.connected || appliedInterval.current) return;
    appliedInterval.current = true;
    if (monitor.health && monitor.health.intervalMs !== settings.intervalMs) {
      void monitor.setIntervalMs(settings.intervalMs);
    }
  }, [monitor, settings.intervalMs]);

  return (
    <div className="shell">
      <Nav page={page} onChange={setPage} />
      <div className="main">
        <TitleBar />
        <div className="content">
          {monitor.serviceError ? (
            <div className="banner" role="status">
              {monitor.serviceError} Open Settings and choose Reload app. Tick Launch sensor service as administrator first if CPU, motherboard, or drive readings stay empty.
            </div>
          ) : null}
          {accessMessage ? (
            <div className="banner" role="status">
              {accessMessage}{" "}
              {pawnMissing ? (
                <button type="button" className="link-button" onClick={() => void openExternal(PAWNIO_RELEASES)}>
                  Install PawnIO
                </button>
              ) : null}
            </div>
          ) : null}
          {monitor.health?.error ? <div className="banner">{monitor.health.error}</div> : null}
          {page === "home" ? <HomePage sensors={sensors} history={monitor.history} unit={settings.unit} /> : null}
          {page === "performance" || page === "cooling" || page === "electrical" || page === "storage" ? (
            <FilteredPage filter={PAGE_FILTERS[page]} sensors={sensors} unit={settings.unit} />
          ) : null}
          {page === "sensors" ? (
            <SensorsPage sensors={sensors} unit={settings.unit} onReset={(id) => void monitor.resetMinMax(id)} />
          ) : null}
          {page === "settings" ? (
            <SettingsPage settings={settings} onChange={update} onReset={() => void monitor.resetMinMax()} />
          ) : null}
        </div>
        <StatusBar
          health={monitor.health}
          connected={monitor.connected}
          updatedAt={monitor.snapshot?.timestamp ?? null}
          sensorCount={sensors.length}
        />
      </div>
    </div>
  );
}

async function openExternal(url: string) {
  if ("__TAURI_INTERNALS__" in window) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener");
}
