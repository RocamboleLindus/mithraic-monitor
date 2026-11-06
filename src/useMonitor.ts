import { useEffect, useState } from "react";
import { SENSOR_BASE } from "./format";
import type { HealthReport, Sample, SensorSnapshot } from "./types";

const HISTORY_MS = 10 * 60 * 1000;

export function useMonitor() {
  const [snapshot, setSnapshot] = useState<SensorSnapshot | null>(null);
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [connected, setConnected] = useState(false);
  const [history, setHistory] = useState<Map<string, Sample[]>>(() => new Map());
  const [serviceError, setServiceError] = useState<string | null>(null);

  useEffect(() => {
    let source: EventSource | null = null;
    let stopped = false;
    let retry = 0;

    const connect = () => {
      source = new EventSource(`${SENSOR_BASE}/api/stream`);
      source.onopen = () => {
        setConnected(true);
        setServiceError(null);
      };
      source.onmessage = (event) => {
        let next: SensorSnapshot;
        try {
          next = JSON.parse(event.data) as SensorSnapshot;
        } catch {
          return;
        }
        const now = Date.now();
        const cutoff = now - HISTORY_MS;
        setSnapshot(next);
        setHistory((current) => {
          const updated = new Map(current);
          for (const sensor of next.sensors) {
            if (sensor.value == null) continue;
            const series = (updated.get(sensor.id) ?? []).filter((sample) => sample.t >= cutoff);
            const last = series[series.length - 1];
            if (!last || now - last.t >= 200) series.push({ t: now, v: sensor.value });
            updated.set(sensor.id, series);
          }
          return updated;
        });
      };
      source.onerror = () => {
        setConnected(false);
        setServiceError("Sensor service is not running.");
        source?.close();
        if (!stopped) retry = window.setTimeout(connect, 2000);
      };
    };

    connect();
    return () => {
      stopped = true;
      window.clearTimeout(retry);
      source?.close();
    };
  }, []);

  useEffect(() => {
    let stopped = false;

    const load = async () => {
      try {
        const response = await fetch(`${SENSOR_BASE}/api/health`);
        if (!response.ok) throw new Error(`Health check returned ${response.status}`);
        const report = (await response.json()) as HealthReport;
        if (!stopped) {
          setHealth(report);
          setServiceError(null);
        }
      } catch {
        if (!stopped) setHealth(null);
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), 4000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  const setIntervalMs = async (intervalMs: number) => {
    const response = await fetch(`${SENSOR_BASE}/api/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intervalMs }),
    });
    if (!response.ok) throw new Error("Could not update the poll interval.");
    const report = (await response.json()) as { intervalMs: number };
    setHealth((current) => (current ? { ...current, intervalMs: report.intervalMs } : current));
  };

  const resetMinMax = async (id?: string) => {
    const response = await fetch(`${SENSOR_BASE}/api/sensors/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id ?? null }),
    });
    if (!response.ok) throw new Error("Could not reset min and max.");
  };

  return { snapshot, health, connected, history, serviceError, setIntervalMs, resetMinMax };
}
