import { MetricCard } from "../components/MetricCard";
import { SensorTable } from "../components/SensorTable";
import { formatReading, formatThroughput } from "../format";
import {
  boardName,
  cpuColumn,
  cpuLoad,
  cpuTemperature,
  gpuGroups,
  gpuLoad,
  gpuTemperature,
  hottestTemperature,
  memoryUse,
  networkRates,
  packagePower,
} from "../pickers";
import type { Sample, SensorReading, TempUnit } from "../types";

type HomePageProps = {
  sensors: SensorReading[];
  history: Map<string, Sample[]>;
  unit: TempUnit;
};

export function HomePage({ sensors, history, unit }: HomePageProps) {
  const cpuTemp = cpuTemperature(sensors);
  const gpuTemp = gpuTemperature(sensors);
  const cpu = cpuLoad(sensors);
  const gpu = gpuLoad(sensors);
  const memory = memoryUse(sensors);
  const power = packagePower(sensors);
  const boardTemp = hottestTemperature(sensors, ["Motherboard", "SuperIO", "EmbeddedController"]);
  const driveTemp = hottestTemperature(sensors, ["Storage"]);
  const rates = networkRates(sensors);
  const gpus = gpuGroups(sensors);
  const boardValue = formatReading(boardTemp, unit);
  const driveValue = formatReading(driveTemp, unit);

  return (
    <section className="page">
      <header className="page-head">
        <h1>Home</h1>
        <p>Live temperatures, load, memory, and package power.</p>
      </header>
      <div className="hero-grid">
        <MetricCard label="CPU temperature" reading={cpuTemp} samples={history.get(cpuTemp?.id ?? "")} unit={unit} />
        <MetricCard label="GPU temperature" reading={gpuTemp} samples={history.get(gpuTemp?.id ?? "")} unit={unit} />
        <MetricCard label="CPU load" reading={cpu} samples={history.get(cpu?.id ?? "")} unit={unit} />
        <MetricCard label="GPU load" reading={gpu} samples={history.get(gpu?.id ?? "")} unit={unit} />
        <MetricCard label="Memory" reading={memory} samples={history.get(memory?.id ?? "")} unit={unit} />
        <MetricCard label="CPU package power" reading={power} samples={history.get(power?.id ?? "")} unit={unit} />
      </div>
      <div className="split">
        <article className="panel">
          <h2>CPU</h2>
          <SensorTable sensors={cpuColumn(sensors)} unit={unit} />
        </article>
        <article className="panel">
          <h2>GPU</h2>
          {gpus.length === 0 ? <p className="empty">No GPU clocks, power, or fan readings yet.</p> : null}
          {gpus.map((group) => (
            <div key={group.name} className="subgroup">
              <h3>{group.name}</h3>
              <SensorTable sensors={group.sensors} unit={unit} />
            </div>
          ))}
        </article>
      </div>
      <div className="strip">
        <article className="panel compact">
          <h2>Board</h2>
          <strong>{boardName(sensors)}</strong>
          <p>
            {boardTemp
              ? `${boardTemp.sensorName} ${boardValue.value}${boardValue.unit ? ` ${boardValue.unit}` : ""}`
              : "No board temperature"}
          </p>
        </article>
        <article className="panel compact">
          <h2>Hottest drive</h2>
          <strong>{driveTemp?.hardwareName ?? "No drive temperature"}</strong>
          <p>
            {driveTemp
              ? `${driveTemp.sensorName} ${driveValue.value}${driveValue.unit ? ` ${driveValue.unit}` : ""}`
              : "Storage temperature appears here when the drive reports it."}
          </p>
        </article>
        <article className="panel compact">
          <h2>Network</h2>
          <strong>{formatThroughput(rates.down)} down</strong>
          <p>{formatThroughput(rates.up)} up</p>
        </article>
      </div>
    </section>
  );
}
