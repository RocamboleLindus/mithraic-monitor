import { useMemo, useState } from "react";
import { SensorTable } from "../components/SensorTable";
import type { SensorReading, TempUnit } from "../types";

type SensorsPageProps = {
  sensors: SensorReading[];
  unit: TempUnit;
  onReset: (id?: string) => void;
};

export function SensorsPage({ sensors, unit, onReset }: SensorsPageProps) {
  const [query, setQuery] = useState("");
  const [showHidden, setShowHidden] = useState(true);
  const needle = query.trim().toLowerCase();

  const groups = useMemo(() => {
    const groups = new Map<string, SensorReading[]>();
    for (const sensor of sensors) {
      if (!showHidden && sensor.hidden) continue;
      const haystack = `${sensor.hardwareName} ${sensor.sensorName} ${sensor.sensorType}`.toLowerCase();
      if (needle && !haystack.includes(needle)) continue;
      const list = groups.get(sensor.hardwareName) ?? [];
      list.push(sensor);
      groups.set(sensor.hardwareName, list);
    }
    return [...groups.entries()].map(([name, items]) => ({
      name,
      sensors: items.sort((a, b) => a.sensorType.localeCompare(b.sensorType) || a.sensorName.localeCompare(b.sensorName)),
    }));
  }, [needle, sensors, showHidden]);

  return (
    <section className="page">
      <header className="page-head">
        <h1>Sensors</h1>
        <p>Every reading from the hardware tree, with the current value, minimum, and maximum.</p>
      </header>
      <div className="toolbar">
        <input
          className="search"
          value={query}
          placeholder="Filter by device or sensor"
          aria-label="Filter sensors"
          onChange={(event) => setQuery(event.target.value)}
        />
        <label className="check">
          <input type="checkbox" checked={showHidden} onChange={(event) => setShowHidden(event.target.checked)} />
          Secondary sensors
        </label>
        <button type="button" className="text-button" onClick={() => onReset()}>
          Reset min / max
        </button>
      </div>
      {groups.length === 0 ? <p className="empty">No sensors match that filter.</p> : null}
      <div className="stack">
        {groups.map((group) => (
          <article className="panel" key={group.name}>
            <h2>
              {group.name}
              <span>{group.sensors.length}</span>
            </h2>
            <SensorTable sensors={group.sensors} unit={unit} onReset={onReset} />
          </article>
        ))}
      </div>
    </section>
  );
}
