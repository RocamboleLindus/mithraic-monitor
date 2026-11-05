import { SensorTable } from "../components/SensorTable";
import { isPrimaryHardware } from "../pickers";
import type { SensorReading, TempUnit } from "../types";

export type PageFilter = {
  title: string;
  lede: string;
  hardwareTypes?: string[];
  sensorTypes?: string[];
  primaryHardwareOnly?: boolean;
};

export const PAGE_FILTERS: Record<"performance" | "cooling" | "electrical" | "storage", PageFilter> = {
  performance: {
    title: "Performance",
    lede: "Clocks, load, and frequency for the CPU and each GPU.",
    hardwareTypes: ["Cpu", "GpuNvidia", "GpuAmd", "GpuIntel"],
    sensorTypes: ["Clock", "Load", "Frequency"],
  },
  cooling: {
    title: "Cooling",
    lede: "Temperatures, fans, flow, and control.",
    sensorTypes: ["Temperature", "Fan", "Flow", "Control", "Noise"],
  },
  electrical: {
    title: "Electrical",
    lede: "Voltages, currents, power, and energy.",
    sensorTypes: ["Voltage", "Current", "Power", "Energy"],
  },
    storage: {
    title: "Storage and network",
    lede: "Drive and adapter readings, including throughput and temperatures.",
    hardwareTypes: ["Storage", "Network"],
    primaryHardwareOnly: true,
  },
};

type FilteredPageProps = {
  filter: PageFilter;
  sensors: SensorReading[];
  unit: TempUnit;
};

export function FilteredPage({ filter, sensors, unit }: FilteredPageProps) {
  const groups = groupSensors(
    sensors.filter((sensor) => {
      if (sensor.hidden) return false;
      if (filter.hardwareTypes && !filter.hardwareTypes.includes(sensor.hardwareType)) return false;
      if (filter.sensorTypes && !filter.sensorTypes.includes(sensor.sensorType)) return false;
      if (filter.primaryHardwareOnly && !isPrimaryHardware(sensor.hardwareName)) return false;
      return true;
    }),
  );

  return (
    <section className="page">
      <header className="page-head">
        <h1>{filter.title}</h1>
        <p>{filter.lede}</p>
      </header>
      {groups.length === 0 ? <p className="empty">No readings for this section yet.</p> : null}
      <div className="stack">
        {groups.map((group) => (
          <article className="panel" key={group.name}>
            <h2>{group.name}</h2>
            <SensorTable sensors={group.sensors} unit={unit} />
          </article>
        ))}
      </div>
    </section>
  );
}

function groupSensors(sensors: SensorReading[]): { name: string; sensors: SensorReading[] }[] {
  const groups = new Map<string, SensorReading[]>();
  for (const sensor of sensors) {
    const list = groups.get(sensor.hardwareName) ?? [];
    list.push(sensor);
    groups.set(sensor.hardwareName, list);
  }
  return [...groups.entries()].map(([name, items]) => ({
    name,
    sensors: items.sort((a, b) => a.sensorType.localeCompare(b.sensorType) || a.sensorName.localeCompare(b.sensorName)),
  }));
}
